import { NextRequest, NextResponse } from "next/server";
import { getIsolatedAIContext } from "@/lib/ai-context";
import { startCostSession, endCostSession } from "@/lib/ai-cost-tracker";
import { ChatMessage, UserResource } from "@/app/actions/agent-types";
import { runGatekeeper, handleInfoOnly, runFinalReporter } from "@/app/actions/agent-helpers";
import { runOrchestratorLoop } from "@/app/actions/agent-orchestrator";

// ─────────────────────────────────────────────────────────
// TEST ENDPOINT — /api/test/agent
// No Clerk auth required. Uses TEST_API_KEY header instead.
// Returns full debug trace alongside the final response.
// Used by test-agent.ps1 script for terminal-based testing.
// ─────────────────────────────────────────────────────────

const TEST_USER: UserResource = {
  id: "test-user-branislav",
  emailAddresses: [{ emailAddress: "branislav@arcigy.group" }],
};

// Intercepts all console.log/warn/error during the request
// and captures them for the debug output
function createConsoleCapture() {
  const captured: { level: string; message: string; timestamp: string }[] = [];
  const original = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  };

  const capture = (level: string) => (...args: any[]) => {
    const message = args.map(a => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ");
    captured.push({ level, message, timestamp: new Date().toISOString() });
    original[level as keyof typeof original](message);
  };

  console.log = capture("log");
  console.warn = capture("warn");
  console.error = capture("error");

  const restore = () => {
    console.log = original.log;
    console.warn = original.warn;
    console.error = original.error;
  };

  return { captured, restore };
}

function createMockSuperState() {
  const stateEvents: any[] = [];
  let finalState: any = null;

  return {
    update: (data: any) => stateEvents.push({ event: "update", data, ts: new Date().toISOString() }),
    done: (data: any) => {
      finalState = data;
      stateEvents.push({ event: "done", data, ts: new Date().toISOString() });
    },
    error: (err: any) => stateEvents.push({ event: "error", data: String(err), ts: new Date().toISOString() }),
    getEvents: () => stateEvents,
    getFinalState: () => finalState,
    value: null,
  };
}

export async function POST(req: NextRequest) {
  // Auth check
  const apiKey = req.headers.get("x-test-api-key");
  if (!apiKey || apiKey !== process.env.TEST_API_KEY) {
    return NextResponse.json({ error: "Unauthorized — set x-test-api-key header" }, { status: 401 });
  }

  const body = await req.json();
  const message: string = body.message || "";
  const history: ChatMessage[] = body.history || [];

  if (!message.trim()) {
    return NextResponse.json({ error: "message field is required" }, { status: 400 });
  }

  const messages: ChatMessage[] = [...history, { role: "user", content: message }];
  const startTime = Date.now();

  // Capture ALL console output during the request
  const { captured: consoleLogs, restore: restoreConsole } = createConsoleCapture();

  try {
    const userEmail = TEST_USER.emailAddresses[0].emailAddress;
    const context = await getIsolatedAIContext(userEmail, "GLOBAL");
    startCostSession(userEmail);

    // ── GATEKEEPER ────────────────────────────────────────
    const gatekeeper_start = Date.now();
    const verdict = await runGatekeeper(messages);
    const gatekeeper_ms = Date.now() - gatekeeper_start;

    // ── INFO_ONLY path ────────────────────────────────────
    if (verdict.intent === "INFO_ONLY") {
      const mockState = createMockSuperState();
      await handleInfoOnly(messages, context, mockState as any, verdict);
      const cost = endCostSession();
      restoreConsole();

      return NextResponse.json({
        _debug: {
          path: "INFO_ONLY",
          total_ms: Date.now() - startTime,
          gatekeeper: { verdict: verdict.intent, ms: gatekeeper_ms },
          console_logs: consoleLogs,
          state_events: mockState.getEvents(),
        },
        response: mockState.getFinalState()?.content ?? "—",
        tool_results: [],
      });
    }

    // ── ACTION path ───────────────────────────────────────
    const mockState = createMockSuperState();
    const loop_start = Date.now();

    const { finalResults, missionHistory, attempts, lastPlan } =
      await runOrchestratorLoop(messages, TEST_USER, mockState as any);

    const loop_ms = Date.now() - loop_start;

    // ── FINAL REPORTER ────────────────────────────────────
    const reporter_start = Date.now();
    const reporterState = createMockSuperState();
    await runFinalReporter(
      messages, finalResults, missionHistory,
      attempts, verdict, reporterState as any, lastPlan
    );
    const reporter_ms = Date.now() - reporter_start;

    const cost = endCostSession();
    restoreConsole();

    return NextResponse.json({
      _debug: {
        path: "ACTION",
        total_ms: Date.now() - startTime,
        iterations: attempts,
        gatekeeper: { verdict: verdict.intent, ms: gatekeeper_ms },
        orchestrator: {
          ms: loop_ms,
          last_plan: lastPlan,
          mission_history_steps: missionHistory.length,
        },
        reporter: { ms: reporter_ms },
        tool_results_summary: finalResults.map(r => ({
          tool: r.tool,
          status: r.status,
          success: (r.result as any)?.success,
          error: (r.result as any)?.error,
        })),
        state_events: mockState.getEvents(),
        console_logs: consoleLogs,
        cost_summary: cost,
      },
      response: reporterState.getFinalState()?.content ?? lastPlan?.message ?? "Misia dokončená.",
      tool_results: finalResults,
    });
  } catch (error: any) {
    restoreConsole();
    const cost = endCostSession();
    return NextResponse.json(
      {
        error: error.message,
        stack: error.stack?.split("\n").slice(0, 8).join("\n"),
        _debug: {
          total_ms: Date.now() - startTime,
          console_logs: consoleLogs,
        },
      },
      { status: 500 }
    );
  }
}
