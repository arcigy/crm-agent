"use server";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, streamText } from "ai";
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

export async function verifyAndStream(
  originalIntent: string,
  results: any[],
  manifest?: ExecutionManifest,
  reflectionNote?: string,
  userName: string = "Používateľ",
  userFullName: string = "Používateľ CRM"
) {
  const start = Date.now();
  const tag = "[VERIFIER_STREAM]";

  try {
    const successCount = manifest ? manifest.successCount : results.filter(
      (r) => r.status === "done" || r.result?.success === true || r.success === true
    ).length;
    const failCount = manifest ? manifest.failCount : results.length - successCount;

    console.log(`${tag} Results: ${results.length} total, ${successCount} success, ${failCount} failed`);

    
    const systemPrompt = `
ROLE:
Professional and friendly CRM Assistant for user: ${userName}.

TONE:
- Friendly colleague, not a robot.
- Concise sentences, clear info.
- No generic "How can I help" or "As an AI".
- Píš po slovensky, používaj neformálne ale profesionálne tykanie.
- ROZLIŠUJ: 
  - Úloha (^): Niečo, čo treba urobiť v budúcnosti.
  - Poznámka (%): Zápis z minulosti alebo informácia.
  - Komentár: Rýchla poznámka v profile kontaktu (v tabuľkách sa zobrazuje ako 'comments').

ENTITY TAGS (Mandatory):
- Contact: @[Meno](id)
- Project: #[Názov](id)
- Deal: $[Názov](id)
- Task: ^[Názov](id)
- Note: %[Názov](id)

FORMATTING:
- ## pre nadpisy, **bold** pre mená a termíny.
- Markdown tabuľky pre štruktúrované dáta.

AVAILABLE ENTITY IDs FOR TAGGING:
${JSON.stringify(manifest?.resolvedEntities || {})}

EXECUTION MANIFEST:
${JSON.stringify(manifest || {})}
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

## AVAILABLE ENTITY IDs FOR TAGGING
Použi tieto ID vo svojich tagoch:
${Object.entries(manifest.resolvedEntities || {})
  .filter(([k, v]) => !k.includes('email') && v !== null && v !== undefined)
  .map(([k, v]) => `${k} = ${v}`)
  .join('\n')}

Napíš finálnu správu pre užívateľa s použitím tagov.
`;
    } else {
      // Legacy fallback
      prompt = `
PÔVODNÝ ZÁMER: ${originalIntent}
VÝSLEDKY: ${JSON.stringify(results.map(r => ({ tool: r.tool, summary: summarizeResult(r) })))}
Napíš finálnu správu.
`;
    }

    const finalSystemPrompt = reflectionNote 
      ? systemPrompt + `\n\nPoznámka zo sebareflexie pre teba (zakomponuj do odpovede priroszene): ${reflectionNote}`
      : systemPrompt;

    const stream = await streamText({
      model: google(AI_MODELS.VERIFIER),
      system: finalSystemPrompt,
      prompt: prompt,
      temperature: 0.3,
    });
    console.log(`${tag} AI stream started in ${Date.now() - start}ms`);

    return stream;
  } catch (error: any) {
    console.error(`${tag} Error: ${error.message}`);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────
// ZACHOVANÉ PRE ZPÄTNÚ KOMPATIBILITU
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
      prompt = `
PÔVODNÝ ZÁMER: ${originalIntent}
VÝSLEDKY: ${JSON.stringify(results.map(r => ({ tool: r.tool, summary: summarizeResult(r) })))}
Napíš finálnu správu.
`;
    }

    const aiStart = Date.now();
    const response = await generateText({
      model: google(AI_MODELS.VERIFIER),
      system: "Si asistent v CRM systéme. Odpovedaj v slovenčine a bez zbytočných formalít.", // Zjednodušený prompt pre kompatibilitu
      prompt: prompt,
    });

    trackAICall(
      "verifier",
      "gemini",
      AI_MODELS.VERIFIER,
      prompt,
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

// FORMATOVANIE PRE FAST-PATH SKIP VERIFICATION
export async function formatDirectResponse(manifest: ExecutionManifest): Promise<string> {
  const entry = manifest.entries[0];
  if (!entry) return "Akcia prebehla.";
  
  const templates: Record<string, (entry: any) => string> = {
    'db_search_contacts': (e) => {
      if (!e.keyOutputs || !Array.isArray(e.keyOutputs) || e.keyOutputs.length === 0) return `⚠️ Kontakt nebol nájdený.`;
      const list = e.keyOutputs.slice(0, 10).map((c: any) => `- **@[${c.name || 'Kontakt'}](${c.id})** ${c.company ? `(${c.company})` : ''}`).join('\n');
      return `✅ Našiel som ${e.keyOutputs.length} kontakt(ov):\n\n${list}${e.keyOutputs.length > 10 ? '\n... a ďalšie.' : ''}`;
    },
    'db_get_pipeline_stats': (e) =>
      `📋 **Pipeline prehľad:**\n- Celková hodnota: **${e.keyOutputs?.total_pipeline_value || 0} €**\n- Počet projektov: ${e.keyOutputs?.total_projects || 0}`,
    'db_get_all_contacts': (e) => 
      `✅ Načítal som všetky kontakty (celkom ${Array.isArray(e.keyOutputs) ? e.keyOutputs.length : 0}).`,
    'db_fetch_projects': (e) => {
      if (!e.keyOutputs || !Array.isArray(e.keyOutputs) || e.keyOutputs.length === 0) return `⚠️ Žiadne projekty neboli nájdené.`;
      const list = e.keyOutputs.slice(0, 5).map((p: any) => 
        `- **#[${p.name || 'Projekt'}](${p.id})** (${p.stage || 'Neznáme'})${p.contact_id ? ` — Kontakt: @[${p.contact_name || 'Kontakt'}](${p.contact_id})` : ''}`
      ).join('\n');
      return `✅ Našiel som ${e.keyOutputs.length} projekt(ov):\n\n${list}`;
    },
    'db_search_projects': (e) => {
      if (!e.keyOutputs || !Array.isArray(e.keyOutputs) || e.keyOutputs.length === 0) return `⚠️ Žiadne projekty neboli nájdené.`;
      const list = e.keyOutputs.slice(0, 5).map((p: any) => 
        `- **#[${p.name || 'Projekt'}](${p.id})**${p.contact_id ? ` (Kontakt: @[${p.contact_name || 'Kontakt'}](${p.contact_id}))` : ''}`
      ).join('\n');
      return `✅ Výsledky hľadania projektov (${e.keyOutputs.length}):\n\n${list}`;
    },
    'db_fetch_tasks': (e) => {
      if (!e.keyOutputs || !Array.isArray(e.keyOutputs) || e.keyOutputs.length === 0) return `✅ Nemáš žiadne úlohy.`;
      const list = e.keyOutputs.slice(0, 10).map((t: any) => `- [${t.completed ? 'x' : ' '}] **^[${t.title}](${t.id})**`).join('\n');
      return `✅ Načítal som ${e.keyOutputs.length} úloh(y):\n\n${list}`;
    },
    'db_fetch_deals': (e) => 
      `✅ Nájdených **${Array.isArray(e.keyOutputs) ? e.keyOutputs.length : 0}** obchodov.`,
    'db_fetch_notes': (e) => 
      `✅ Nájdených **${Array.isArray(e.keyOutputs) ? e.keyOutputs.length : 0}** poznámok.`,
    'gmail_fetch_list': (e) => {
      if (!e.keyOutputs || !Array.isArray(e.keyOutputs) || e.keyOutputs.length === 0) return `✅ Žiadne nové e-maily.`;
      const list = e.keyOutputs.slice(0, 5).map((m: any) => `- **${m.subject}** (${m.from})`).join('\n');
      return `✅ Zoznam e-mailov (${e.keyOutputs.length}):\n\n${list}`;
    },

  };

  const template = templates[entry.tool];
  return template ? template(entry) : (entry.summary || "Operácia bola úspešne dokončená.");
}

