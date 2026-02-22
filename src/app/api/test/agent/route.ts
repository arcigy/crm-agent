import { NextRequest, NextResponse } from "next/server";
import { startCostSession, endCostSession } from "@/lib/ai-cost-tracker";
import { ChatMessage, UserResource } from "@/app/actions/agent-types";
import { runGatekeeper } from "@/app/actions/agent-helpers";
import { runOrchestratorLoop } from "@/app/actions/agent-orchestrator";
import { verifyExecutionResults } from "@/app/actions/agent-verifier";

// ─────────────────────────────────────────────────────────────────────────────
// /api/test/agent  — terminal-friendly test endpoint
// Auth: x-test-api-key header (no Clerk)
// User: branislav@arcigy.group
// Returns: { response, tool_results, _debug }
// ─────────────────────────────────────────────────────────────────────────────

const TEST_USER: UserResource = {
  id: "test-user-branislav",
  emailAddresses: [{ emailAddress: "branislav@arcigy.group" }],
};

// Capture server-side console output for debug
function createConsoleCapture() {
  const logs: { level: string; message: string; ts: string }[] = [];
  const orig = { log: console.log, warn: console.warn, error: console.error };

  const cap = (level: string) => (...args: any[]) => {
    const msg = args.map(a => typeof a === "object" ? JSON.stringify(a, null, 0) : String(a)).join(" ");
    logs.push({ level, message: msg, ts: new Date().toISOString() });
    (orig as any)[level](msg);
  };

  console.log = cap("log");
  console.warn = cap("warn");
  console.error = cap("error");

  return {
    logs,
    restore: () => { console.log = orig.log; console.warn = orig.warn; console.error = orig.error; }
  };
}

// Dummy superState that doesn't use RSC streams — just collects data
function createDummySuperState() {
  let finalData: any = null;
  const events: any[] = [];
  return {
    update: (d: any) => events.push({ event: "update", data: d }),
    done:   (d: any) => { finalData = d; events.push({ event: "done", data: d }); },
    error:  (e: any) => events.push({ event: "error", data: String(e) }),
    getFinalData: () => finalData,
    getEvents: () => events,
    value: null,
  };
}

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-test-api-key");
  if (!apiKey || apiKey !== process.env.TEST_API_KEY) {
    return NextResponse.json({ error: "Unauthorized — set x-test-api-key header" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const message: string = body.message || "";
  const history: ChatMessage[] = body.history || [];

  if (!message.trim()) {
    return NextResponse.json({ error: "message field is required" }, { status: 400 });
  }

  const messages: ChatMessage[] = [...history, { role: "user", content: message }];
  const t0 = Date.now();
  const { logs: consoleLogs, restore } = createConsoleCapture();

  try {
    startCostSession(TEST_USER.emailAddresses[0].emailAddress);

    // ── 1. GATEKEEPER ─────────────────────────────────────────────────────────
    const t_gk = Date.now();
    console.log(`[TEST] Running gatekeeper for: "${message}"`);
    const verdict = await runGatekeeper(messages);
    const gk_ms = Date.now() - t_gk;
    console.log(`[TEST] Gatekeeper: ${verdict.intent} (${gk_ms}ms)`);

    // ── 2. INFO_ONLY shortcut ─────────────────────────────────────────────────
    if (verdict.intent === "INFO_ONLY") {
      const cost = endCostSession();
      restore();
      return NextResponse.json({
        _debug: {
          path: "INFO_ONLY",
          total_ms: Date.now() - t0,
          gatekeeper: { verdict: verdict.intent, ms: gk_ms },
          console_logs: consoleLogs,
        },
        response: "Táto správa bola klasifikovaná ako INFO_ONLY (konverzačná). Pre akčné požiadavky sa opýtaj konkrétne.",
        tool_results: [],
      });
    }

    // ── 3. ORCHESTRATOR LOOP ──────────────────────────────────────────────────
    const t_loop = Date.now();
    const dummyState = createDummySuperState();
    console.log(`[TEST] Starting orchestrator loop...`);

    const { finalResults, missionHistory, attempts, lastPlan } =
      await runOrchestratorLoop(messages, TEST_USER, dummyState as any);

    const loop_ms = Date.now() - t_loop;
    console.log(`[TEST] Loop done: ${attempts} iterations, ${finalResults.length} tool results (${loop_ms}ms)`);

    // ── 4. VERIFIER — get friendly response ───────────────────────────────────
    const t_verify = Date.now();
    let response = "Misia dokončená.";
    try {
      const verification = await verifyExecutionResults(message, finalResults);
      response = verification.analysis || response;
      console.log(`[TEST] Verifier done in ${Date.now() - t_verify}ms`);
    } catch(e: any) {
      console.error(`[TEST] Verifier failed: ${e.message} — using fallback`);
      const ok = finalResults.filter(r => r.status === "done").length;
      response = ok > 0
        ? `Vykonal som ${ok}/${finalResults.length} akcií úspešne.`
        : lastPlan?.message ?? "Misia dokončená bez akcií.";
    }

    const cost = endCostSession();
    restore();

    return NextResponse.json({
      _debug: {
        path: "ACTION",
        total_ms: Date.now() - t0,
        iterations: attempts,
        gatekeeper:   { verdict: verdict.intent, ms: gk_ms },
        orchestrator: { ms: loop_ms, last_plan: lastPlan, steps_count: missionHistory.length },
        verifier:     { ms: Date.now() - t_verify },
        tool_results_summary: finalResults.map(r => ({
          tool:    r.tool,
          status:  r.status,
          success: (r.result as any)?.success,
          error:   (r.result as any)?.error ?? null,
        })),
        state_events: dummyState.getEvents(),
        console_logs: consoleLogs,
        cost_summary: cost,
      },
      response,
      tool_results: finalResults,
    });

  } catch (err: any) {
    restore();
    endCostSession();
    console.error(`[TEST] FATAL: ${err.message}`);
    return NextResponse.json({
      error: err.message,
      stack: err.stack?.split("\n").slice(0, 6).join("\n"),
      _debug: { total_ms: Date.now() - t0, console_logs: consoleLogs },
    }, { status: 500 });
  }
}
