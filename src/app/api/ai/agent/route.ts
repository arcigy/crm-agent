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

export async function POST(req: Request) {
    const { messages, debug = false } = await req.json();
    const host = req.headers.get("host") || "";
    const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
    let user = await currentUser();
    
    // Bypass for local testing
    if (!user && isLocal) {
        user = {
            id: 'user_39LUuptq4hAUjFIskaea5cMCbWb',
            emailAddresses: [{ emailAddress: 'branislav@arcigy.group' }]
        } as any;
    }

    if (!user || !user.emailAddresses?.[0]?.emailAddress) {
        return new Response('Unauthorized', { status: 401 });
    }

    const userEmail = user.emailAddresses[0].emailAddress;
    startCostSession(userEmail);
    const lastUserMsg = messages[messages.length - 1].content;

    // Use a TransformStream to send logs as they happen
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    const log = async (stage: string, message: string, detail?: any) => {
        const logEntry = { stage, message, data: detail, timestamp: new Date().toISOString(), isLog: true };
        if (debug) {
            // We encode the log as a special JSON line that the client can parse
            await writer.write(encoder.encode(`LOG:${JSON.stringify(logEntry)}\n`));
        }
        console.log(` [${stage}] ${message}`, detail ? JSON.stringify(detail, null, 2) : '');
    };

    // Keep the actual processing in the background but wait for it before ending the stream
    (async () => {
        try {
            // 1. ROUTER: Decide Intent
            await log("ROUTER", "Analyzing intent...");
            const routing = await routeIntent(lastUserMsg, messages);
            await log("ROUTER", "Result", routing);

            if (routing.type === 'CONVERSATION') {
                await log("ROUTER", "Route: Simple Conversation");
                const result = streamText({
                    model: google('gemini-2.0-flash'),
                    system: `You are a helpful CRM assistant. User: ${userEmail}. Be concise.`,
                    messages: messages,
                });
                for await (const delta of result.textStream) {
                    await writer.write(encoder.encode(delta));
                }
                return;
            }

            // ---------------------------
            // ITERATIVE EXECUTION LOOP
            // ---------------------------
            let iterations = 0;
            const MAX_ITERATIONS = 5;
            const finalResults: any[] = [];
            const currentHistory = [...messages];

            while (iterations < MAX_ITERATIONS) {
                iterations++;
                await log("LOOP", `Iteration ${iterations}/${MAX_ITERATIONS}`);

                await log("ORCHESTRATOR", "Planning...");
                const taskPlan = await orchestrateParams(iterations === 1 ? lastUserMsg : null, currentHistory);
                await log("ORCHESTRATOR", "Plan", taskPlan.steps);

                if (!taskPlan.steps || taskPlan.steps.length === 0) {
                    await log("LOOP", "No more steps. Finished.");
                    break;
                }

                await log("PREPARER", "Validating next step...");
                const nextStep = taskPlan.steps[0];
                const validation = await validateActionPlan(taskPlan.intent, [nextStep], currentHistory);
                await log("PREPARER", "Validation", { valid: validation.valid, questions: validation.questions });

                if (!validation.valid) {
                    await log("LOOP", "Blocked. Asking user: " + validation.questions[0]);
                    await writer.write(encoder.encode(validation.questions[0]));
                    return;
                }

                const stepToRun = validation.validated_steps[0];
                try {
                    await log("EXECUTOR", `Executing ${stepToRun.tool}...`, stepToRun.args);
                    const res = await executeAtomicTool(stepToRun.tool, stepToRun.args, user!);
                    await log("EXECUTOR", "Result", res);
                    
                    const resultMsg = {
                        role: "assistant",
                        content: `Tool '${stepToRun.tool}' executed. Output: ${JSON.stringify(res)}`
                    };
                    currentHistory.push(resultMsg);
                    finalResults.push({ tool: stepToRun.tool, status: res.success ? 'success' : 'error', output: res });

                } catch(e: any) {
                    const errorMessage = e instanceof Error ? e.message : String(e);
                    await log("EXECUTOR", "Error", errorMessage);
                    finalResults.push({ tool: stepToRun.tool, status: 'error', output: errorMessage });
                    currentHistory.push({
                        role: "assistant",
                        content: `Tool '${stepToRun.tool}' failed. Error: ${errorMessage}`
                    });
                }
            }

            // 5. VERIFIER
            await log("VERIFIER", "Analyzing results...");
            const finalIntent = lastUserMsg.length > 50 ? "complex_task" : "simple_task"; 
            
            const verification = await verifyExecutionResults(finalIntent, finalResults);
            await log("VERIFIER", "Analysis", verification.analysis);
            
            const finalResponseText = verification.analysis;

            // Final Report Generation & Streaming
            const reportResult = streamText({
                model: google('gemini-2.0-flash'),
                prompt: `System: Send this exact message to user: "${finalResponseText}"`,
            });

            for await (const delta of reportResult.textStream) {
                await writer.write(encoder.encode(delta));
            }

            // --- FINAL COST CALCULATION ---
            const sessionSummary = endCostSession();
            if (sessionSummary) {
                // Return cost in cents (USD * 100)
                const costInCents = sessionSummary.totalCost * 100;
                await log("COST", `Celková cena dopytu: ${costInCents.toFixed(3)} centov`);
            }

        } catch (error: any) {
            await log("ERROR", "Global Pipeline Error", error.message);
            await writer.write(encoder.encode("Prepáč, nastala neočakávaná chyba pri spracovaní úlohy."));
        } finally {
            await writer.close();
        }
    })();

    // We return the readable stream immediately
    return new Response(readable, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
}
