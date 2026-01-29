/**
 * AI Cost Tracker - Presné sledovanie nákladov na AI volania
 *
 * Počíta input/output tokeny a násobí cenami pre každý model.
 * Podporuje OpenAI, Anthropic a Google Gemini.
 */

// === CENNÍK MODELOV (Január 2026, per 1M tokens) ===

export const AI_PRICING = {
  // OpenAI
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4o": { input: 2.5, output: 10.0 },
  "gpt-5-nano": { input: 0.05, output: 0.4 },
  "gpt-5-mini": { input: 0.25, output: 2.0 },
  "gpt-5.1": { input: 1.25, output: 10.0 },
  "gpt-5.2": { input: 1.75, output: 14.0 },

  // Anthropic Claude
  "claude-3-5-sonnet-20241022": { input: 3.0, output: 15.0 },
  "claude-sonnet-4-20250514": { input: 3.0, output: 15.0 },
  "claude-3-5-haiku-20241022": { input: 1.0, output: 5.0 },
  "claude-3-opus-20240229": { input: 15.0, output: 75.0 },
  "claude-haiku-4.5": { input: 1.0, output: 5.0 },
  "claude-sonnet-4.5": { input: 3.0, output: 15.0 },
  "claude-opus-4.5": { input: 5.0, output: 25.0 },

  // Google Gemini
  "gemini-2.0-flash": { input: 0.1, output: 0.4 },
  "gemini-2.5-flash": { input: 0.3, output: 2.5 },
  "gemini-3-flash": { input: 0.5, output: 3.0 },
  "gemini-3-pro": { input: 2.0, output: 12.0 },
  "gemini-1.5-pro": { input: 1.25, output: 5.0 },
} as const;

export type ModelName = keyof typeof AI_PRICING;

// === COST TRACKING TYPES ===

export interface AICallCost {
  id: string;
  timestamp: Date;
  phase:
    | "gatekeeper"
    | "orchestrator"
    | "verifier"
    | "reporter"
    | "conversational"
    | "email_classifier";
  provider: "openai" | "anthropic" | "gemini";
  model: string;
  inputTokens: number;
  outputTokens: number;
  inputCost: number; // v USD
  outputCost: number; // v USD
  totalCost: number; // v USD
  durationMs: number;
}

export interface SessionCost {
  sessionId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  calls: AICallCost[];
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  breakdown: {
    openai: number;
    anthropic: number;
    gemini: number;
  };
}

// === GLOBAL SESSION STORAGE ===

let currentSession: SessionCost | null = null;
const sessionHistory: SessionCost[] = [];

// === HELPER FUNCTIONS ===

/**
 * Odhadne počet tokenov z textu (približný odhad)
 * OpenAI: ~4 znaky = 1 token
 * Claude: podobne
 * Gemini: podobne
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  // Priemerný odhad: 1 token ≈ 4 znaky pre angličtinu
  // Pre slovenčinu/češtinu môže byť menej efektívne (~3.5 znaky)
  return Math.ceil(text.length / 3.5);
}

/**
 * Vypočíta náklad za tokeny
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): { inputCost: number; outputCost: number; totalCost: number } {
  const pricing = AI_PRICING[model as ModelName] || { input: 1.0, output: 5.0 };

  // Ceny sú per 1M tokens, takže delíme 1,000,000
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;

  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
  };
}

/**
 * Začne novú session pre sledovanie nákladov
 */
export function startCostSession(userId: string): string {
  const sessionId = crypto.randomUUID();

  currentSession = {
    sessionId,
    userId,
    startTime: new Date(),
    calls: [],
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCost: 0,
    breakdown: {
      openai: 0,
      anthropic: 0,
      gemini: 0,
    },
  };

  return sessionId;
}

/**
 * Zaznamená AI volanie s nákladmi
 */
export function trackAICall(
  phase: AICallCost["phase"],
  provider: AICallCost["provider"],
  model: string,
  inputText: string,
  outputText: string,
  durationMs: number,
  actualInputTokens?: number,
  actualOutputTokens?: number,
): AICallCost {
  const inputTokens = actualInputTokens ?? estimateTokens(inputText);
  const outputTokens = actualOutputTokens ?? estimateTokens(outputText);
  const { inputCost, outputCost, totalCost } = calculateCost(
    model,
    inputTokens,
    outputTokens,
  );

  const call: AICallCost = {
    id: crypto.randomUUID(),
    timestamp: new Date(),
    phase,
    provider,
    model,
    inputTokens,
    outputTokens,
    inputCost,
    outputCost,
    totalCost,
    durationMs,
  };

  // Aktualizuj session
  if (currentSession) {
    currentSession.calls.push(call);
    currentSession.totalInputTokens += inputTokens;
    currentSession.totalOutputTokens += outputTokens;
    currentSession.totalCost += totalCost;
    currentSession.breakdown[provider] += totalCost;
  }

  return call;
}

/**
 * Ukončí session a vráti súhrn
 */
export function endCostSession(): SessionCost | null {
  if (!currentSession) return null;

  currentSession.endTime = new Date();
  sessionHistory.push({ ...currentSession });

  const result = { ...currentSession };
  currentSession = null;

  return result;
}

/**
 * Získa aktuálnu session
 */
export function getCurrentSession(): SessionCost | null {
  return currentSession;
}

/**
 * Získa históriu sessions
 */
export function getSessionHistory(): SessionCost[] {
  return sessionHistory;
}

/**
 * Formátuje náklady na čitateľný string
 */
export function formatCost(usd: number): string {
  if (usd < 0.01) {
    return `$${(usd * 100).toFixed(4)}¢`;
  }
  return `$${usd.toFixed(6)}`;
}

/**
 * Formátuje celú session na čitateľný report
 */
export function formatSessionReport(session: SessionCost): string {
  const duration = session.endTime
    ? (
        (session.endTime.getTime() - session.startTime.getTime()) /
        1000
      ).toFixed(2)
    : "ongoing";

  let report = `
╔══════════════════════════════════════════════════════════════╗
║                    AI COST REPORT                            ║
╠══════════════════════════════════════════════════════════════╣
║ Session ID: ${session.sessionId.slice(0, 8)}...                              ║
║ User: ${session.userId.slice(0, 20).padEnd(20)}                    ║
║ Duration: ${String(duration).padEnd(10)}s                              ║
╠══════════════════════════════════════════════════════════════╣
║ TOKENS                                                       ║
║   Input:  ${String(session.totalInputTokens).padStart(10)} tokens                      ║
║   Output: ${String(session.totalOutputTokens).padStart(10)} tokens                      ║
║   Total:  ${String(session.totalInputTokens + session.totalOutputTokens).padStart(10)} tokens                      ║
╠══════════════════════════════════════════════════════════════╣
║ COSTS BY PROVIDER                                            ║
║   OpenAI:    ${formatCost(session.breakdown.openai).padStart(12)}                          ║
║   Anthropic: ${formatCost(session.breakdown.anthropic).padStart(12)}                          ║
║   Gemini:    ${formatCost(session.breakdown.gemini).padStart(12)}                          ║
╠══════════════════════════════════════════════════════════════╣
║ TOTAL COST: ${formatCost(session.totalCost).padStart(12)}                             ║
╚══════════════════════════════════════════════════════════════╝
`;

  // Detailný breakdown po fázach
  report += "\n📊 BREAKDOWN BY PHASE:\n";
  const phases = [
    "gatekeeper",
    "orchestrator",
    "verifier",
    "reporter",
    "conversational",
  ] as const;

  for (const phase of phases) {
    const phaseCalls = session.calls.filter((c) => c.phase === phase);
    if (phaseCalls.length > 0) {
      const phaseCost = phaseCalls.reduce((sum, c) => sum + c.totalCost, 0);
      const phaseTokens = phaseCalls.reduce(
        (sum, c) => sum + c.inputTokens + c.outputTokens,
        0,
      );
      report += `  ${phase.toUpperCase().padEnd(15)} ${phaseTokens.toString().padStart(6)} tokens → ${formatCost(phaseCost)}\n`;
    }
  }

  return report;
}

/**
 * Vytvorí JSON export pre uloženie do databázy
 */
export function exportSessionForDB(session: SessionCost): object {
  return {
    session_id: session.sessionId,
    user_id: session.userId,
    start_time: session.startTime.toISOString(),
    end_time: session.endTime?.toISOString(),
    total_input_tokens: session.totalInputTokens,
    total_output_tokens: session.totalOutputTokens,
    total_cost_usd: session.totalCost,
    openai_cost_usd: session.breakdown.openai,
    anthropic_cost_usd: session.breakdown.anthropic,
    gemini_cost_usd: session.breakdown.gemini,
    calls_count: session.calls.length,
    calls_json: JSON.stringify(session.calls),
  };
}
