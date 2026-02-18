import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, generateText } from 'ai';
import { currentUser } from '@clerk/nextjs/server';

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// ------------------------------------------------------------------
// 5-STAGE AGENT PIPELINE IMPLEMENTATION
// ------------------------------------------------------------------

import { routeIntent } from '@/app/actions/agent-router';
import { orchestrateParams } from '@/app/actions/agent-orchestrator';
import { validateActionPlan } from '@/app/actions/agent-preparer';
import { verifyExecutionResults } from '@/app/actions/agent-verifier';
import { executeAtomicTool } from '@/app/actions/agent-executors';

export async function POST(req: Request) {
    const { messages, debug = false } = await req.json();
    const user = await currentUser();

    if (!user || !user.emailAddresses?.[0]?.emailAddress) {
        return new Response('Unauthorized', { status: 401 });
    }

    const userEmail = user.emailAddresses[0].emailAddress;
    const lastUserMsg = messages[messages.length - 1].content;
    const debugLog: { stage: string; message: string; data?: any; timestamp: string }[] = [];

    const log = (stage: string, message: string, data?: Record<string, unknown> | unknown) => {
        const entry = { stage, message, data, timestamp: new Date().toISOString() };
        debugLog.push(entry);
        console.log(` [${stage}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    };

    // 1. ROUTER: Decide Intent
    // ------------------------
    log("ROUTER", "Analyzing intent...");
    const routing = await routeIntent(lastUserMsg, messages);
    log("ROUTER", "Result", routing);

    if (routing.type === 'CONVERSATION') {
        log("ROUTER", "Route: Simple Conversation");
        const result = streamText({
            model: google('gemini-2.0-flash'),
            system: `You are a helpful CRM assistant. User: ${userEmail}. Be concise.`,
            messages: messages,
        });
        
        if (debug) {
            const { text } = await generateText({
                model: google('gemini-2.0-flash'),
                system: `You are a helpful CRM assistant. User: ${userEmail}. Be concise.`,
                messages: messages,
            });
            return Response.json({ response: text, debugLog });
        }
        
        return result.toTextStreamResponse();
    }

    // ---------------------------
    // ITERATIVE EXECUTION LOOP (ReAct)
    // ---------------------------
    let iterations = 0;
    const MAX_ITERATIONS = 5;
    const finalResults = [];
    const currentHistory = [...messages];

    while (iterations < MAX_ITERATIONS) {
        iterations++;
        log("LOOP", `Iteration ${iterations}/${MAX_ITERATIONS}`);

        // 2. ORCHESTRATE
        log("ORCHESTRATOR", "Planning...");
        const taskPlan = await orchestrateParams(null, currentHistory);
        log("ORCHESTRATOR", "Plan", taskPlan.steps);

        if (!taskPlan.steps || taskPlan.steps.length === 0) {
            log("LOOP", "No more steps. Finished.");
            break;
        }

        // 3. PREPARE (Pick next valid step)
        log("PREPARER", "Validating next step...");
        const nextStep = taskPlan.steps[0];
        const validation = await validateActionPlan(taskPlan.intent, [nextStep], currentHistory);
        log("PREPARER", "Validation", { valid: validation.valid, questions: validation.questions });

        if (!validation.valid) {
            log("LOOP", "Blocked. Asking user: " + validation.questions[0]);
            if (debug) return Response.json({ response: validation.questions[0], debugLog, status: 'blocked' });
            return new Response(validation.questions[0], { status: 200 }); 
        }

        // 4. EXECUTE (Run the single valid step)
        const stepToRun = validation.validated_steps[0];
        try {
            log("EXECUTOR", `Executing ${stepToRun.tool}...`, stepToRun.args);
            const res = await executeAtomicTool(stepToRun.tool, stepToRun.args, user);
            log("EXECUTOR", "Result", res);
            
            const resultMsg = {
                role: "assistant",
                content: `Tool '${stepToRun.tool}' executed. Output: ${JSON.stringify(res)}`
            };
            currentHistory.push(resultMsg);
            finalResults.push({ tool: stepToRun.tool, status: res.success ? 'success' : 'error', output: res });

        } catch(e: unknown) {
             const errorMessage = e instanceof Error ? e.message : String(e);
             log("EXECUTOR", "Error", errorMessage);
             finalResults.push({ tool: stepToRun.tool, status: 'error', output: errorMessage });
             currentHistory.push({
                 role: "assistant",
                 content: `Tool '${stepToRun.tool}' failed. Error: ${errorMessage}`
             });
        }
    }

    // 5. VERIFIER: Analyze & Respond
    // ------------------------------
    log("VERIFIER", "Analyzing results...");
    const finalIntent = lastUserMsg.length > 50 ? "complex_task" : "simple_task"; 
    const verification = await verifyExecutionResults(finalIntent, finalResults);
    log("VERIFIER", "Analysis", verification.analysis);
    
    const finalResponse = verification.analysis;

    if (debug) {
        return Response.json({ response: finalResponse, debugLog, status: 'complete' });
    }

    const result = streamText({
        model: google('gemini-2.0-flash'),
        prompt: `System: Send this exact message to user: "${finalResponse}"`,
    });
    
    return result.toTextStreamResponse();
}
