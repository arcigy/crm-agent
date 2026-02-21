import { NextRequest, NextResponse } from "next/server";
import { getIsolatedAIContext } from "@/lib/ai-context";
import { startCostSession, endCostSession } from "@/lib/ai-cost-tracker";
import { ChatMessage, UserResource } from "@/app/actions/agent-types";
import { runGatekeeper, handleInfoOnly, runFinalReporter } from "@/app/actions/agent-helpers";
import { runOrchestratorLoop } from "@/app/actions/agent-orchestrator";

const TEST_USER: UserResource = {
  id: "test-user-branislav",
  emailAddresses: [{ emailAddress: "branislav@arcigy.group" }],
};

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
    value: null,
  };
}

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-test-api-key");
  if (apiKey !== process.env.TEST_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const message: string = body.message;
  const history: ChatMessage[] = body.history || [];

  const messages: ChatMessage[] = [...history, { role: "user", content: message }];
  const debugLogs: any[] = [];
  const stageLog = (stage: string, msg: string, data?: any) => {
    debugLogs.push({ stage, message: msg, data, timestamp: new Date().toISOString() });
  };

  try {
    const userEmail = TEST_USER.emailAddresses[0].emailAddress;
    const context = await getIsolatedAIContext(userEmail, "GLOBAL");
    startCostSession(userEmail);

    stageLog("ROUTER", "Analyzing...");
    const verdict = await runGatekeeper(messages);

    if (verdict.intent === "INFO_ONLY") {
      const mockState = createMockSuperState();
      await handleInfoOnly(messages, context, mockState as any, verdict);
      return NextResponse.json({ logs: debugLogs, verdict: "INFO_ONLY", response: mockState.getFinalState()?.content });
    }

    const mockState = createMockSuperState();
    const { finalResults, missionHistory, attempts, lastPlan } =
      await runOrchestratorLoop(messages, TEST_USER, mockState as any);

    stageLog("LOOP", `Plan: ${lastPlan?.intent || "none"}`, { thought: lastPlan?.thought });

    for (const log of mockState.getLogs()) {
        if (log.data?.message) stageLog("LOOP", log.data.message);
        if (log.data?.status === "executing") stageLog("EXECUTOR", `Executed: ${log.data?.step}`);
    }

    const reporterState = createMockSuperState();
    await runFinalReporter(messages, finalResults, missionHistory, attempts, verdict, reporterState as any, lastPlan);
    
    endCostSession();
    return NextResponse.json({
      logs: debugLogs,
      verdict: "ACTION",
      response: reporterState.getFinalState()?.content,
      toolResults: finalResults
    });
  } catch (error: any) {
    console.error("STRESS ERROR:", error);
    endCostSession();
    return NextResponse.json({ error: error.message, logs: debugLogs }, { status: 500 });
  }
}
