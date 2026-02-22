"use server";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { trackAICall } from "@/lib/ai-cost-tracker";
import { AI_MODELS } from "@/lib/ai-providers";

// ─────────────────────────────────────────────────────────
// VERIFIER
// Translates raw missionState results into one coherent,
// friendly Slovak response. THIS IS THE ONLY LAYER THE USER SEES.
//
// Rules (per agentmasterexecution.md):
// 1. Slovak, informal but professional ("ty" form)
// 2. Lead with what SUCCEEDED, not what failed
// 3. All succeeded → 2-3 sentences max
// 4. Partial → clear split: done / not done / what to do next
// 5. NEVER expose: stack traces, UUIDs, internal field names
// 6. NEVER say "As an AI" — be direct and specific
// ─────────────────────────────────────────────────────────

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

import { ExecutionManifest } from "./agent-manifest-builder";

export async function verifyExecutionResults(
  originalIntent: string,
  results: any[],
  manifest?: ExecutionManifest
) {
  const start = Date.now();
  const tag = "[VERIFIER]";

  try {
    const successCount = manifest ? manifest.successCount : results.filter(
      (r) => r.status === "done" || r.result?.success === true || r.success === true
    ).length;
    const failCount = manifest ? manifest.failCount : results.length - successCount;

    console.log(`${tag} Results: ${results.length} total, ${successCount} success, ${failCount} failed`);
    
    const systemPrompt = `
Si Verifier v CRM systéme. Prekladáš výsledky agenta do jednej jasnej, ľudsky čitateľnej odpovede pre používateľa.

PRAVIDLÁ:
1. Píš v slovenčine, neformálne ale profesionálne (tykanie)
2. Začni vždy tým čo sa PODARILO
3. Emoji: ✅ hotovo · ❌ zlyhalo · 📋 info — použi striedmo
4. Všetko OK → stručné potvrdenie (2-3 vety MAX)
5. Čiastočný úspech → jasne rozdeľ: čo prebehlo / čo zlyhalo / čo má urobiť ďalej
6. NIKDY neodhaľuj: raw UUIDs, interné ID, model names, stack traces
7. NIKDY nepoužívaj frázу "Ako AI"
8. PROAKTÍVNA PAMÄŤ: Ak vidíš úspešné "sys_capture_memory", spomeň to prirodzene na konci správy.
9. EXPLICITNÝ REPORT: Ak uvidíš v detailoch krok "sys_show_info" (Zobrazenie informácií v chate), jeho obsah (content) vypíš do správy DOSLOVA tak, ako je v dátach. Toto má najvyššiu prioritu a ignoruj vtedy pravidlo o 3 vetách.
`;

    let prompt = "";
    if (manifest) {
      prompt = `
PÔVODNÝ ZÁMER: ${manifest.goal}
STAV: ${manifest.successCount} úspechov, ${manifest.failCount} zlyhaní

DETAILNÉ VÝSLEDKY:
${manifest.entries.map(e => `
Krok ${e.step}: ${e.humanName}
Stav: ${e.status}
Výsledok: ${e.summary}
Dáta: ${JSON.stringify(e.keyOutputs)}
`).join("\n---\n")}

Napíš finálnu správu pre užívateľa.
`;
    } else {
      // Legacy fallback
      prompt = `
PÔVODNÝ ZÁMER: ${originalIntent}
VÝSLEDKY: ${JSON.stringify(results.map(r => ({ tool: r.tool, summary: summarizeResult(r) })))}
Napíš finálnu správu.
`;
    }

    const aiStart = Date.now();
    const response = await generateText({
      model: google(AI_MODELS.VERIFIER),
      system: systemPrompt,
      prompt: prompt,
    });
    console.log(`${tag} AI call finished in ${Date.now() - aiStart}ms`);

    trackAICall(
      "verifier",
      "gemini",
      AI_MODELS.VERIFIER,
      systemPrompt + prompt,
      response.text,
      Date.now() - start,
      (response.usage as any).inputTokens || 0,
      (response.usage as any).outputTokens || 0
    );

    return {
      success: failCount === 0,
      analysis: response.text,
      stats: { success: successCount, failed: failCount },
    };
  } catch (error: any) {
    console.error(`${tag} Error: ${error.message}`);
    return {
      success: false,
      analysis: "Nepodarilo sa verifikovať výsledky misie.",
    };
  }
}

// Strip internal UUIDs/IDs from result data — never expose to user
function summarizeResult(r: any): string {
  try {
    const data = r.result?.data || r.data;
    if (!data) return r.result?.message || r.message || "";

    if (Array.isArray(data)) {
      return `Počet položiek: ${data.length}${data[0]?.first_name ? `, prvý: ${data[0].first_name} ${data[0].last_name || ""}` : ""}`;
    }

    if (typeof data === "object") {
      const { id: _id, user_id: _u, ...safe } = data as any;
      // Keep only human-readable fields
      const readable = Object.entries(safe)
        .filter(([, v]) => typeof v === "string" || typeof v === "number" || typeof v === "boolean")
        .filter(([k]) => !k.includes("_id") && !k.includes("token") && k !== "id")
        .slice(0, 5)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      return readable;
    }

    return String(data).substring(0, 200);
  } catch {
    return "";
  }
}
