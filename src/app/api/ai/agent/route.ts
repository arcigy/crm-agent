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
import { verifyExecutionResults } from '@/app/actions/agent-verifier';
import { executeAtomicTool } from '@/app/actions/agent-executors';
import { startCostSession, endCostSession } from '@/lib/ai-cost-tracker';
import { AI_MODELS } from '@/lib/ai-providers';
import { buildExecutionManifest } from '@/app/actions/agent-manifest-builder';
import { selfReflect } from '@/app/actions/agent-self-reflector';
import { extractAndStoreIds } from '@/app/actions/agent-self-corrector';
import { MissionState, ToolResult } from '@/app/actions/agent-types';

export async function POST(req: Request) {
    const { messages, debug = false } = await req.json();
    const host = req.headers.get("host") || "";
    const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
    let user = await currentUser();
    
    if (!user && isLocal) {
        user = { id: 'user_39LUuptq4hAUjFIskaea5cMCbWb', emailAddresses: [{ emailAddress: 'branislav@arcigy.group' }] } as any;
    }

    if (!user || !user.emailAddresses?.[0]?.emailAddress) return new Response('Unauthorized', { status: 401 });

    const userEmail = user.emailAddresses[0].emailAddress;
    startCostSession(userEmail);
    const lastUserMsg = messages[messages.length - 1].content;

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
            const routing = await routeIntent(lastUserMsg, messages);
            await log("ROUTER", "Result", routing);

            if (routing.type === 'CONVERSATION') {
                await log("ROUTER", "Route: Simple Conversation");
                const result = streamText({ 
                    model: google(AI_MODELS.ROUTER), 
                    system: `Si pomocník v CRM pre ${userEmail}. Odpovedaj v slovenčine. Buď vtipný, ľudský a stručný.`, 
                    messages 
                });
                for await (const delta of result.textStream) await writer.write(encoder.encode(delta));
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
                toolCallCounts: {}
            };

            const goal = routing.orchestrator_brief_structured?.goal || lastUserMsg;

            while (iter < 10) {
                iter++;
                state.iteration = iter;
                await log("LOOP", `Iteration ${iter}/10`);
                await log("ORCHESTRATOR", "Planning...");
                
                const taskPlan = await orchestrateParams(
                  messages, 
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
            }

            // 4. MANIFEST & REFLECTION
            await log("MANIFEST", "Building execution manifest...");
            const manifest = buildExecutionManifest(goal, state);
            
            await log("REFLECTION", "Auditing mission success...");
            const reflection = await selfReflect(goal, manifest);
            
            if (reflection.reflectionNote) {
                await log("REFLECTION", "Note", reflection.reflectionNote);
            }

            await log("VERIFIER", "Analyzing results...");
            const verification = await verifyExecutionResults(lastUserMsg, finalResults, manifest);
            await log("VERIFIER", "Analysis", verification.analysis);
            
            // 5. FINAL REPORT
            const reportResult = streamText({ 
                model: google(AI_MODELS.REPORT), 
                system: `Si priateľský CRM asistent. Tvojou úlohou je doručiť užívateľovi finálnu správu o výsledku jeho požiadavky. Odpovedaj v slovenčine. ${reflection.reflectionNote ? `Poznámka pre teba: ${reflection.reflectionNote}` : ''}`,
                prompt: `Sformuluj finálnu odpoveď na základe tejto analýzy: "${verification.analysis}"` 
            });
            for await (const delta of reportResult.textStream) await writer.write(encoder.encode(delta));

            const sessionSummary = endCostSession();
            if (sessionSummary) await log("COST", `Celková cena dopytu: ${(sessionSummary.totalCost * 100).toFixed(3)} centov`);

        } catch (error: any) {
            await log("ERROR", "Global Pipeline Error", error.message);
            await writer.write(encoder.encode("Prepáč, nastala neočakávaná chyba."));
        } finally {
            await writer.close();
        }
    })();

    return new Response(readable, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
