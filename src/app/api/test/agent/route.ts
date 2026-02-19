import { NextRequest, NextResponse } from "next/server";
import { getIsolatedAIContext } from "@/lib/ai-context";
import { startCostSession, endCostSession } from "@/lib/ai-cost-tracker";
import { ChatMessage, UserResource } from "@/app/actions/agent-types";
import { runGatekeeper, handleInfoOnly, runFinalReporter } from "@/app/actions/agent-helpers";
import { runOrchestratorLoop } from "@/app/actions/agent-orchestrator";

// Simulated user — same as the real CRM user (branislav@arcigy.group)
const TEST_USER: UserResource = {
  id: "test-user-branislav",
  emailAddresses: [{ emailAddress: "branislav@arcigy.group" }],
};

// Mock superState that collects logs instead of streaming
function createMockSuperState() {
  const logs: any[] = [];
  let finalState: any = null;

  return {
    update: (data: any) => {
      logs.push({ event: "update", data, timestamp: new Date().toISOString() });
    },
    done: (data: any) => {
      finalState = data;
      logs.push({ event: "done", data, timestamp: new Date().toISOString() });
    },
    error: (err: any) => {
      logs.push({ event: "error", data: err, timestamp: new Date().toISOString() });
    },
    getLogs: () => logs,
    getFinalState: () => finalState,
    // Mimic createStreamableValue interface
    value: null,
  };
}

export async function POST(req: NextRequest) {
  // Auth: check test API key
  const apiKey = req.headers.get("x-test-api-key");
  if (apiKey !== process.env.TEST_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const message: string = body.message;
  const history: ChatMessage[] = body.history || [];

  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const messages: ChatMessage[] = [
    ...history,
    { role: "user", content: message },
  ];

  const debugLogs: any[] = [];
  const stageLog = (stage: string, msg: string, data?: any) => {
    debugLogs.push({ stage, message: msg, data, timestamp: new Date().toISOString() });
  };

  try {
    const userEmail = TEST_USER.emailAddresses[0].emailAddress;
    const context = await getIsolatedAIContext(userEmail, "GLOBAL");
    startCostSession(userEmail);

    // === STAGE 1: GATEKEEPER ===
    stageLog("ROUTER", "Analyzing intent...");
    const verdict = await runGatekeeper(messages);
    stageLog("ROUTER", "Result", { type: verdict.intent, reason: (verdict as any).reason || "" });

    if (verdict.intent === "INFO_ONLY") {
      stageLog("ROUTER", "Route: Simple Conversation");
      const mockState = createMockSuperState();
      await handleInfoOnly(messages, context, mockState as any, verdict);
      const finalState = mockState.getFinalState();
      stageLog("VERIFIER", "Analysis", finalState?.content || "No response");
      const cost = endCostSession();
      stageLog("COST", `Celková cena dopytu: ${cost?.totalCostCents?.toFixed(3) || "0.000"} centov`);
      return NextResponse.json({ logs: debugLogs, verdict: "INFO_ONLY", response: finalState?.content });
    }

    // === STAGE 2: ORCHESTRATOR LOOP ===
    stageLog("LOOP", "Starting orchestrator loop...");
    const mockState = createMockSuperState();

    const { finalResults, missionHistory, attempts, lastPlan } =
      await runOrchestratorLoop(messages, TEST_USER, mockState as any);

    // Log each iteration from mock state
    for (const log of mockState.getLogs()) {
      if (log.data?.message) stageLog("LOOP", log.data.message);
      if (log.data?.status === "executing") stageLog("EXECUTOR", `Executing ${log.data?.step || "tool"}...`);
    }

    stageLog("LOOP", `Finished after ${attempts} iteration(s)`);
    stageLog("EXECUTOR", "Results", finalResults);

    // === STAGE 3: FINAL REPORTER ===
    stageLog("VERIFIER", "Analyzing results...");
    const reporterState = createMockSuperState();
    await runFinalReporter(messages, finalResults, missionHistory, attempts, verdict, reporterState as any, lastPlan);
    const finalResponse = reporterState.getFinalState();
    stageLog("VERIFIER", "Analysis", finalResponse?.content || "No response");

    const cost = endCostSession();
    stageLog("COST", `Celková cena dopytu: ${cost?.totalCostCents?.toFixed(3) || "0.000"} centov`);

    return NextResponse.json({
      logs: debugLogs,
      verdict: "ACTION",
      response: finalResponse?.content,
      toolResults: finalResults,
    });
  } catch (error: any) {
    endCostSession();
    stageLog("ERROR", error.message, { stack: error.stack });
    return NextResponse.json({ logs: debugLogs, error: error.message }, { status: 500 });
  }
}
