import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import { currentUser } from '@clerk/nextjs/server';

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY || '' });

/* ------------------------------------------------------------------
   5-STAGE AGENT PIPELINE IMPLEMENTATION
   ------------------------------------------------------------------ */

import { routeIntent } from '@/app/actions/agent-router';
import { orchestrateParams } from '@/app/actions/agent-orchestrator';
import { validateActionPlan } from '@/app/actions/agent-preparer';
import { verifyAndStream, verifyExecutionResults, formatDirectResponse } from '@/app/actions/agent-verifier';
import { executeAtomicTool } from '@/app/actions/agent-executors';
import { startCostSession, endCostSession } from '@/lib/ai-cost-tracker';
import { AI_MODELS } from '@/lib/ai-providers';
import { buildExecutionManifest } from '@/app/actions/agent-manifest-builder';
import { selfReflect } from '@/app/actions/agent-self-reflector';
import { extractAndStoreIds } from '@/app/actions/agent-self-corrector';
import { saveUserMessage, saveAssistantMessage, loadChatHistory } from '@/lib/message-store';
import { generateAndSaveChatTitle } from '@/lib/chat-title-generator';
import directus from '@/lib/directus';
import { readItems, createItem } from '@directus/sdk';
import { MissionState, ToolResult } from '@/app/actions/agent-types';

export async function POST(req: Request) {
    const { message, conversationId, debug = false, messages: reqMessages } = await req.json();
    const host = req.headers.get("host") || "";
    const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
    let user = await currentUser();
    
    if (!user && isLocal) {
        user = { id: 'user_39LUuptq4hAUjFIskaea5cMCbWb', emailAddresses: [{ emailAddress: 'branislav@arcigy.group' }] } as any;
    }

    if (!user || !user.emailAddresses?.[0]?.emailAddress) return new Response('Unauthorized', { status: 401 });

    const userEmail = user.emailAddresses[0].emailAddress;
    startCostSession(userEmail);

    let activeConversationId = conversationId;
    let history: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    // Použijeme buď prenesené messagy alebo si ich stiahneme, ak máme conversationId
    if (activeConversationId) {
        history = await loadChatHistory(activeConversationId);
    } else {
        // Skontroluj limit a vytvor novu konverzaciu
        try {
            const existing = await directus.request(readItems('conversations', {
                filter: { user_id: { _eq: user.id }, deleted_at: { _null: true } },
                aggregate: { count: ['id'] },
            }));
            const count = Number((existing[0]?.count as any)?.id ?? 0);
            if (count >= 20) {
                 return Response.json({ error: 'CHAT_LIMIT_REACHED', message: 'Dosiahol si limit 20 konverzácií.' }, { status: 429 });
            }
            const newConv = await directus.request(createItem('conversations', {
                user_id: user.id,
                title: 'Nová konverzácia',
                message_count: 0,
            }));
            activeConversationId = newConv.id;
        } catch (e) {
            console.error("Failed to create conversation:", e);
        }
    }

    const isFirstMessage = history.length === 0;
    const lastUserMsg = message || (reqMessages ? reqMessages[reqMessages.length - 1].content : '');
    const messages = [...history, { role: 'user' as const, content: lastUserMsg }];

    // SAVE USER MESSAGE IMMEDIATELY TO PREVENT RACE CONDITION
    if (activeConversationId) {
        try {
            await saveUserMessage(activeConversationId, lastUserMsg);
        } catch (e) {
            console.error("Failed to save user message", e);
        }
    }

    let fullAgentResponse = ''; // Bude akumulovať odpoveď pre zápis do histórie


    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    const log = async (stage: string, message: string, detail?: any) => {
        const logEntry = { stage, message, data: detail, timestamp: new Date().toISOString(), isLog: true };
        if (debug) await writer.write(encoder.encode(`LOG:${JSON.stringify(logEntry)}\n`));
        console.log(` [${stage}] ${message}`, detail ? JSON.stringify(detail, null, 2) : '');
    };

    (async () => {
        try {
            await log("ROUTER", "Analyzing intent...");
            const routing = await routeIntent(lastUserMsg, messages as any);
            await log("ROUTER", "Result", routing);

            if (routing.type === 'CONVERSATION') {
                await log("ROUTER", "Route: Simple Conversation");
                const result = streamText({ 
                    model: google(AI_MODELS.ROUTER),
                    system: `Si pokročilý AI asistent pre ${userEmail}. Odpovedaj výlučne v slovenčine. 
Aktuálny dátum a čas, podľa ktorého sa musíš VŽDY orientovať: **${new Date().toLocaleString('sk-SK', { timeZone: 'Europe/Bratislava' })}**.

TVOJE PRAVIDLÁ PRE VÝSTUP (MANDATORY):
- Na otázky odpovedaj priamo, bez omáčok (žiadne "Samozrejme, tu je tvoja odpoveď:").
- Na formátovanie používaj exkluzívne Markdown. 
- Pri tvorbe zoznamov používaj Markdown tabuľky alebo odrážky.
- Kód VŽDY obaľuj do Markdown code-blokov s definovaným jazykom (napr. \`\`\`typescript).
- Zvýrazňuj kľúčové vety a dôležité mená/čísla **tučným** textom.
- Nadpisy rob cez ## alebo ### (NIKDY nepoužívaj #).`, 
                    messages: messages as any 
                });
                for await (const delta of result.textStream) {
        fullAgentResponse += delta;
        await writer.write(encoder.encode(delta));
    }
                return;
            }

            // C2 FIX: Confidence threshold gate
            // If router is not confident + has ambiguities → ask user instead of going to orchestrator
            const CONFIDENCE_THRESHOLD = 0.65;
            const ambiguities = routing.orchestrator_brief_structured?.ambiguities ?? [];
            if (routing.confidence < CONFIDENCE_THRESHOLD && ambiguities.length > 0) {
                await log("ROUTER", `Low confidence (${routing.confidence}), requesting clarification`);
                const clarification = ambiguities.length > 0
                    ? `Pred tým, ako začnem, potrebujem vedieť: ${ambiguities.join(", ")}`
                    : `Môžeš mi upresnit, čo presnne chceš spravit? Napríklad pre koho alebo čo?`;
                await writer.write(encoder.encode(clarification));
                return;
            }

            let iter = 0;
            const finalResults: any[] = [];
            const missionHistory: any[] = [];
            const state: MissionState = {
                iteration: 0,
                resolvedEntities: {},
                completedTools: [],
                lastToolResult: null,
                allResults: [],
                correctionAttempts: 0,
                toolCallCounts: {},
                checklist: [],
                checklistComplete: false
            };

            const goal = routing.orchestrator_brief_structured?.goal || lastUserMsg;

            while (iter < 10) {
                iter++;
                state.iteration = iter;
                await log("LOOP", `Iteration ${iter}/10`);
                await log("ORCHESTRATOR", "Planning...");
                
                const taskPlan = await orchestrateParams(
                  messages as any, 
                  missionHistory,
                  state,
                  routing.orchestrator_brief,
                  routing.negative_constraints
                );
                await log("ORCHESTRATOR", "Plan", taskPlan.steps);

                if (!taskPlan.steps?.length) {
                    await log("LOOP", "No more steps. Finished.");
                    break;
                }

                const step = taskPlan.steps[0];
                const validation = await validateActionPlan(taskPlan.intent, [step], messages, missionHistory);
                await log("PREPARER", "Validation", { valid: validation.valid, questions: validation.questions });

                if (!validation.valid) {
                    await log("LOOP", "Blocked. Asking user...");
                    await writer.write(encoder.encode(validation.questions[0]));
                    return;
                }

                const stepToRun = validation.validated_steps[0];
                try {
                    await log("EXECUTOR", `Executing ${stepToRun.tool}...`, stepToRun.args);
                    const res = await executeAtomicTool(stepToRun.tool, stepToRun.args, user!);
                    await log("EXECUTOR", "Result", res);
                    
                    const toolResult: ToolResult = {
                        tool: stepToRun.tool,
                        success: res.success,
                        data: (res as any).data,
                        error: (res as any).error,
                        message: (res as any).message,
                        originalArgs: stepToRun.args
                    };

                    extractAndStoreIds(toolResult, state);
                    state.lastToolResult = toolResult;
                    state.allResults.push(toolResult);
                    state.completedTools.push(stepToRun.tool);

                    finalResults.push({ tool: stepToRun.tool, status: res.success ? 'success' : 'error', output: res });
                    missionHistory.push({ steps: [{ tool: stepToRun.tool, args: stepToRun.args, status: res.success ? 'done' : 'error', result: res }], verification: { success: res.success } });
                } catch(e: any) {
                    await log("EXECUTOR", "Error", e.message);
                    break;
                }

                // ── NOVÝ EXIT CHECK (FIX #1 - Refined) ────────
                if (state.checklist.length > 0 && state.checklistComplete) {
                   await log("LOOP", "Checklist complete. Exiting...");
                   break;
                }
                
                if (state.checklist.length === 0 && state.lastToolResult?.success) {
                   // Ak LLM už v tomto kroku navrhlo viacero paralelných krokov, určite nekončíme predčasne
                   if (taskPlan.steps && taskPlan.steps.length > 1) {
                      continue;
                   }

                   const TERMINAL_TOOLS = new Set([
                     'db_get_pipeline_stats', 'db_fetch_projects', 'db_fetch_tasks', 
                     'db_fetch_deals', 'db_fetch_notes', 'gmail_fetch_list', 
                     'sys_show_info', 'db_get_all_contacts'
                   ]);
                   
                   if (TERMINAL_TOOLS.has(stepToRun.tool)) {
                      await log("LOOP", "Terminal tool executed. Exiting...");
                      break;
                   }
                   
                   // Skip extra LLM call for purely retrieval search intents
                   // Pridané: fakturuj, priprav, generuj, archivuj, exportuj, analyzuj, napíš
                   const writeVerbs = [
                     "vytvor", "pridaj", "pošli", "zmaž", "uprav", "zlúč", "prirad", "vyrieš", 
                     "naplánuj", "zmeň", "nastav", "fakturuj", "priprav", "generuj", "archivuj", 
                     "exportuj", "analyzuj", "napíš", "napiš", "odstráň", "create", "add", 
                     "send", "delete", "update", "change", "archive", "generate", "prepare"
                   ];
                   const isWriteIntent = writeVerbs.some(v => goal.toLowerCase().includes(v));
                   
                   if (stepToRun.tool === 'db_search_contacts' && !isWriteIntent) {
                      await log("LOOP", "Search complete for read intent. Exiting...");
                      break;
                   }
                }
            }

            // 4. MANIFEST & REFLECTION
            await log("MANIFEST", "Building execution manifest...");
            const manifest = buildExecutionManifest(goal, state);
            
            await log("REFLECTION", "Auditing mission success...");
            const reflection = await selfReflect(goal, manifest);
            
            if (reflection.reflectionNote) {
                await log("REFLECTION", "Note", reflection.reflectionNote);
            }

            // 5. VERIFIER & FINAL REPORT (FIX #2 merged, FIX #6 skip)
            
            // Check for trivial fast-path
            const VERIFIER_SKIP_TOOLS = new Set([
              'db_search_contacts', 'db_fetch_projects', 'db_get_pipeline_stats', 
              'db_fetch_tasks', 'gmail_fetch_list', 'calendar_check_availability'
            ]);
            
            const canSkipVerifier = manifest.totalSteps === 1 && manifest.failCount === 0 && manifest.successCount === 1 && VERIFIER_SKIP_TOOLS.has(manifest.entries[0]?.tool);

            if (canSkipVerifier) {
                await log("VERIFIER", "Skipping for trivial read-only mission, fast generation...");
                const directResponse = await formatDirectResponse(manifest);
                fullAgentResponse = directResponse;
                await writer.write(encoder.encode(directResponse));
            } else {
                await log("VERIFIER", "Analyzing and streaming results...");
                const reportStream = await verifyAndStream(lastUserMsg, finalResults, manifest, reflection.reflectionNote);
                
                for await (const delta of reportStream.textStream) {
                    fullAgentResponse += delta;
                    await writer.write(encoder.encode(delta));
                }
            }

            const sessionSummary = endCostSession();
            if (sessionSummary) await log("COST", `Celková cena dopytu: ${(sessionSummary.totalCost * 100).toFixed(3)} centov`);
        } catch (error: any) {
            await log("ERROR", "Global Pipeline Error", error.message);
            await writer.write(encoder.encode("Prepáč, nastala neočakávaná chyba."));
        } finally {
            if (activeConversationId && fullAgentResponse) {
                try {
                    await saveAssistantMessage(activeConversationId, fullAgentResponse);
                    if (isFirstMessage) {
                        generateAndSaveChatTitle(activeConversationId, lastUserMsg, fullAgentResponse).catch(console.error);
                    }
                } catch(e) {
                    console.error("Failed to save assistant message", e);
                }
            }
            await writer.close();
        }
    })();

    return new Response(readable, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Conversation-Id': activeConversationId || '' } });
}
