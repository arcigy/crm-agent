"use server";

import { createStreamableValue } from "@ai-sdk/rsc";
import { currentUser } from "@clerk/nextjs/server";
import { getIsolatedAIContext } from "@/lib/ai-context";
import { startCostSession, endCostSession } from "@/lib/ai-cost-tracker";
import { AgentStep, ChatMessage, UserResource } from "./agent-types";
import {
  runGatekeeper,
  handleInfoOnly,
  runFinalReporter,
} from "./agent-helpers";
import { runOrchestratorLoop } from "./agent-orchestrator";

/**
 * Main entry point for chatting with the AI CRM Agent.
 * Orchestrates multiple specialized LLMs to perform actions and answer queries.
 */
export async function chatWithAgent(messages: ChatMessage[]) {
  const superState = createStreamableValue({
    toolResults: [] as AgentStep[],
    content: "",
    status: "thinking" as const,
    attempt: 1,
    thoughts: {
      intent: "",
      plan: [] as string[],
      extractedData: null as Record<string, unknown> | null,
    },
    providers: {
      gatekeeper: "OpenAI GPT-4o-mini",
      orchestrator: "Anthropic Claude 3.7 Sonnet",
      verifier: "Google Gemini 2.0 Flash",
      reporter: "Google Gemini 2.0 Flash",
    },
    costTracking: null as any, // Typed as SessionCost in usage
  });

  (async () => {
    try {
      const user = (await currentUser()) as unknown as UserResource | null;
      if (!user) {
        superState.error("Unauthorized");
        return;
      }
      const rawEmail = user.emailAddresses[0]?.emailAddress;
      if (!rawEmail) {
        superState.error("User email not found");
        return;
      }
      const userEmail = rawEmail.toLowerCase();
      const context = await getIsolatedAIContext(userEmail, "GLOBAL");

      startCostSession(userEmail);

      // 1. GATEKEEPER - Identifies intent and extracts data
      const verdict = await runGatekeeper(messages);

      superState.update({
        toolResults: [],
        content: "",
        status: "thinking" as const,
        attempt: 1,
        thoughts: {
          intent:
            verdict.intent === "INFO_ONLY"
              ? "Iba informačná otázka"
              : "Požiadavka na akciu v systéme",
          extractedData: verdict.extracted_data,
          plan: [],
        },
        providers: {
          gatekeeper: "OpenAI GPT-4o-mini",
          orchestrator: "Anthropic Claude 3.7 Sonnet",
          verifier: "Google Gemini 2.0 Flash",
          reporter: "Google Gemini 2.0 Flash",
        },
        costTracking: null,
      });

      if (verdict.intent === "INFO_ONLY") {
        await handleInfoOnly(messages, context, superState, verdict);
        return;
      }

      // 2. ORCHESTRATOR LOOP - Performs actions using tools
      const { finalResults, missionHistory, attempts, lastPlan } =
        await runOrchestratorLoop(messages, user, superState);

      // 3. FINAL REPORTER - Summarizes the mission
      await runFinalReporter(
        messages,
        finalResults,
        missionHistory,
        attempts,
        verdict,
        superState,
        lastPlan,
      );
    } catch (error) {
      console.error("Agent Error:", error);
      endCostSession();
      superState.error(error instanceof Error ? error.message : String(error));
    }
  })();

  return { stream: superState.value };
}
