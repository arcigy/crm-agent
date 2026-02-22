/**
 * test-agent-direct.js
 * 
 * Priame testovanie AI agenta bez Next.js/Clerk/RSC.
 * Volá Gemini API a Directus priamo pomocou fetch.
 * 
 * Použitie:
 *   node scripts/test-agent-direct.js "Aké kontakty mám v CRM?"
 *   node scripts/test-agent-direct.js "Vytvor kontakt Peter Novak peter@test.sk"
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// ── Load .env.local ───────────────────────────────────────────────────────────
function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), ".env.local");
    const lines = readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx < 0) continue;
      const key = trimmed.substring(0, eqIdx).trim();
      const val = trimmed.substring(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      if (key && !process.env[key]) process.env[key] = val;
    }
  } catch (e) {
    // also try .env
    try {
      const envPath = resolve(process.cwd(), ".env");
      const lines = readFileSync(envPath, "utf8").split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx < 0) continue;
        const key = trimmed.substring(0, eqIdx).trim();
        const val = trimmed.substring(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
        if (key && !process.env[key]) process.env[key] = val;
      }
    } catch {}
  }
}
loadEnv();

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL || "https://directus-buk1-production.up.railway.app";
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN || "3cSXW-vP-3ujjyXvS0-htoPcsSQOZ5GE";
const USER_EMAIL = "branislav@arcigy.group";

if (!GEMINI_KEY) {
  console.error("❌ GEMINI_API_KEY not set in .env.local");
  process.exit(1);
}

// ── Colors ────────────────────────────────────────────────────────────────────
const C = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  gray: "\x1b[90m",
  white: "\x1b[37m",
  bold: "\x1b[1m",
};
const log = (color, label, msg) => console.log(`${color}${C.bold}[${label}]${C.reset} ${msg}`);
const sep = (title) => console.log(`\n${C.cyan}${"─".repeat(60)}${title ? ` ${title}` : ""}${C.reset}`);

// ── Gemini API call ───────────────────────────────────────────────────────────
async function callGemini(systemPrompt, userPrompt, model = "gemini-flash-latest", retries = 3) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;
  const body = {
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
  };
  for (let attempt = 1; attempt <= retries; attempt++) {
    const t = Date.now();
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60000),
      });
      if (res.status === 503 || res.status === 429) {
        const wait = attempt * 3000;
        console.log(`${C.yellow}  [GEMINI] ${res.status} overloaded — retry ${attempt}/${retries} in ${wait/1000}s...${C.reset}`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${await res.text()}`);
      const data = await res.json();
      console.log(`${C.gray}  [GEMINI] ${model} responded in ${Date.now()-t}ms${C.reset}`);
      return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    } catch (err) {
      if (attempt < retries && err.name === "TimeoutError") {
        console.log(`${C.yellow}  [GEMINI] Timeout — retry ${attempt}/${retries}...${C.reset}`);
        continue;
      }
      throw err;
    }
  }
  throw new Error(`Gemini failed after ${retries} attempts`);
}

// ── Directus fetch helper ────────────────────────────────────────────────────
async function directusFetch(path, method = "GET", body = null) {
  const opts = {
    method,
    headers: {
      "Authorization": `Bearer ${DIRECTUS_TOKEN}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(15000),
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${DIRECTUS_URL}${path}`, opts);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Directus ${method} ${path} → HTTP ${res.status}: ${err.substring(0, 200)}`);
  }
  return res.json();
}

// ── STAGE 1: ROUTER ───────────────────────────────────────────────────────────
async function runRouter(userMsg) {
  log("ROUTER", "ROUTER", `Classifying: "${userMsg}"`);
  const t = Date.now();

  const systemPrompt = `Si CRM agent router. Klasifikuj správu a extrahuj entitity.
Odpovedaj VÝHRADNE JSON (bez markdown):
{
  "type": "TASK" | "CONVERSATION",
  "goal": "čistý popis čo treba spraviť",
  "entities": { "contacts": [], "companies": [], "emails": [] },
  "tool_hint": "db_search_contacts | db_create_contact | db_get_all_contacts | db_create_project | gmail_send_email | db_create_task | none"
}
Pravidlo: Ak správa obsahuje akýkoľvek konkrétny zámer s CRM dátami → TASK. Inak CONVERSATION.`;

  const raw = await callGemini(systemPrompt, userMsg);
  const json = raw.substring(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  const result = JSON.parse(json);
  log("ROUTER", "ROUTER", `${result.type} | goal="${result.goal}" | hint=${result.tool_hint} (${Date.now()-t}ms)`);
  return result;
}

// ── STAGE 2: ORCHESTRATOR — decide which tool to call ─────────────────────────
async function runOrchestrator(userMsg, resolvedEntities, completedTools, lastResult) {
  const tools = [
    { name: "db_get_all_contacts",    desc: "Zoznam všetkých kontaktov", args: {} },
    { name: "db_search_contacts",     desc: "Vyhľadaj kontakt podľa mena/emailu/firmy", args: { query: "string" } },
    { name: "db_create_contact",      desc: "Vytvor nový kontakt", args: { first_name: "str", last_name: "str", email: "str?" } },
    { name: "db_get_all_projects",    desc: "Zoznam všetkých projektov", args: {} },
    { name: "db_create_project",      desc: "Vytvor projekt (vyžaduje contact_id)", args: { name: "str", contact_id: "str" } },
    { name: "db_create_task",         desc: "Vytvor úlohu", args: { title: "str", user_email: "str" } },
    { name: "DONE",                   desc: "Misia dokončená, viac krokov nie je potrebných", args: {} },
  ];

  const systemPrompt = `Si CRM orchestrátor. Rozhodni JEDEN ďalší krok.

CIEĽ: ${userMsg}
SPLNENÉ KROKY: ${completedTools.join(", ") || "žiadne"}
DOSTUPNÉ ENTITY: ${JSON.stringify(resolvedEntities)}
POSLEDNÝ VÝSLEDOK: ${lastResult ? JSON.stringify(lastResult).substring(0, 300) : "žiadny"}

DOSTUPNÉ TOOLY:
${tools.map(t => `- ${t.name}: ${t.desc} | args: ${JSON.stringify(t.args)}`).join("\n")}

PRAVIDLÁ:
1. Ak entita (contact_id atď.) je v DOSTUPNÉ ENTITY → použi ju priamo
2. Ak si splnil cieľ → DONE
3. Volaj vždy len 1 tool

Odpovedaj VÝHRADNE JSON:
{ "tool": "názvToolu", "args": { ...args }, "reasoning": "prečo tento tool" }`;

  const raw = await callGemini(systemPrompt, userMsg);
  const json = raw.substring(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  return JSON.parse(json);
}

// ── STAGE 3: EXECUTOR — run the tool ─────────────────────────────────────────
async function executeTool(tool, args) {
  switch (tool) {
    case "db_get_all_contacts": {
      const data = await directusFetch(`/items/contacts?filter[deleted_at][_null]=true&filter[user_email][_eq]=${encodeURIComponent(USER_EMAIL)}&limit=20&sort=-date_created`);
      return { success: true, data: data.data, count: data.data?.length };
    }
    case "db_search_contacts": {
      const q = encodeURIComponent(args.query || "");
      const data = await directusFetch(`/items/contacts?search=${q}&filter[deleted_at][_null]=true&limit=10`);
      return { success: true, data: data.data, count: data.data?.length };
    }
    case "db_create_contact": {
      const payload = { ...args, user_email: USER_EMAIL, status: "active" };
      const data = await directusFetch("/items/contacts", "POST", payload);
      return { success: true, data: data.data, id: data.data?.id };
    }
    case "db_get_all_projects": {
      const data = await directusFetch(`/items/projects?filter[deleted_at][_null]=true&limit=20&sort=-date_created`);
      return { success: true, data: data.data, count: data.data?.length };
    }
    case "db_create_project": {
      const payload = { ...args, user_email: USER_EMAIL, stage: "lead" };
      const data = await directusFetch("/items/projects", "POST", payload);
      return { success: true, data: data.data, id: data.data?.id };
    }
    case "db_create_task": {
      const payload = { title: args.title, user_email: USER_EMAIL, completed: false };
      const data = await directusFetch("/items/crm_tasks", "POST", payload);
      return { success: true, data: data.data, id: data.data?.id };
    }
    default:
      return { success: false, error: `Neznámy tool: ${tool}` };
  }
}

// ── ID EXTRACTOR ──────────────────────────────────────────────────────────────
function extractIds(toolName, result, resolved) {
  const d = result.data;
  if (!d) return;
  const updates = {};
  if (d.id)         updates.last_id = String(d.id);
  if (d.id)         updates[`${toolName}_id`] = String(d.id);
  if (d.contact_id) updates.contact_id = String(d.contact_id);
  if (d.email)      updates.contact_email = d.email;
  if (Array.isArray(d) && d[0]?.id) {
    updates.last_id = String(d[0].id);
    updates.contact_id = String(d[0].id);
    if (d[0].email) updates.contact_email = d[0].email;
  }
  Object.assign(resolved, updates);
  if (Object.keys(updates).length > 0) {
    log("MEMORY", "ID-EXTRACTOR", `Stored: ${JSON.stringify(updates)}`);
  }
}

// ── STAGE 4: VERIFIER ─────────────────────────────────────────────────────────
async function runVerifier(userMsg, allResults) {
  const summary = allResults.map(r => ({
    tool: r.tool, success: r.result.success,
    count: r.result.count,
    id: r.result.id,
    error: r.result.error,
  }));
  const raw = await callGemini(
    "Si CRM asistent. Odpovedaj v slovenčine, max 2 vety. Stručne zhrň čo sa stalo.",
    `Cieľ: "${userMsg}"\nVýsledky: ${JSON.stringify(summary)}`
  );
  return raw.trim();
}

// ── MAIN PIPELINE ─────────────────────────────────────────────────────────────
async function runAgent(userMsg) {
  const t0 = Date.now();
  sep("START");
  log("USER", "MSG", `"${userMsg}"`);
  console.log(`${C.gray}  User: ${USER_EMAIL}${C.reset}`);

  // Stage 1: Router
  sep("STAGE 1: ROUTER");
  const routing = await runRouter(userMsg);

  if (routing.type === "CONVERSATION") {
    const reply = await callGemini("Si priateľský CRM asistent. Odpovedaj stručne po slovensky.", userMsg);
    sep("RESPONSE");
    console.log(`\n  ${C.white}${reply}${C.reset}\n`);
    return;
  }

  // Stage 2-3: Orchestrator + Executor loop
  sep("STAGE 2-3: ORCHESTRATOR LOOP");
  const resolvedEntities = {};
  const completedTools = [];
  const allResults = [];
  let lastResult = null;
  const MAX_ITER = 8;

  for (let i = 1; i <= MAX_ITER; i++) {
    const t_iter = Date.now();
    log("LOOP", `ITER ${i}/${MAX_ITER}`, `resolvedEntities: ${JSON.stringify(resolvedEntities)}`);

    const plan = await runOrchestrator(userMsg, resolvedEntities, completedTools, lastResult);
    log("PLAN", "ORCHESTRATOR", `tool="${plan.tool}" reasoning="${plan.reasoning}"`);
    if (plan.args && Object.keys(plan.args).length) {
      log("PLAN", "ARGS", JSON.stringify(plan.args));
    }

    if (plan.tool === "DONE") {
      log("DONE", "LOOP", "Mission complete ✅");
      break;
    }

    // Execute
    log("EXEC", "EXECUTOR", `Calling ${plan.tool}...`);
    const t_exec = Date.now();
    try {
      const result = await executeTool(plan.tool, plan.args || {});
      const exec_ms = Date.now() - t_exec;

      if (result.success) {
        log("OK", "EXECUTOR", `✅ ${plan.tool} → success (${exec_ms}ms)${result.count !== undefined ? ` count=${result.count}` : ""}${result.id ? ` id=${result.id}` : ""}`);
        extractIds(plan.tool, result, resolvedEntities);
        completedTools.push(plan.tool);
        lastResult = result;
        allResults.push({ tool: plan.tool, result });
      } else {
        log("ERR", "EXECUTOR", `❌ ${plan.tool} → ${result.error}`);
        allResults.push({ tool: plan.tool, result });
        break;
      }
    } catch (err) {
      log("ERR", "EXECUTOR", `❌ Exception: ${err.message}`);
      allResults.push({ tool: plan.tool, result: { success: false, error: err.message } });
      break;
    }

    log("ITER", "DONE", `Iteration ${i} finished in ${Date.now() - t_iter}ms`);
  }

  // Stage 4: Verifier
  sep("STAGE 4: VERIFIER");
  let response = "Misia dokončená.";
  try {
    response = await runVerifier(userMsg, allResults);
  } catch (e) {
    log("ERR", "VERIFIER", e.message);
    const ok = allResults.filter(r => r.result.success).length;
    response = `Vykonal som ${ok}/${allResults.length} krokov úspešne.`;
  }

  // Final output
  sep("AGENT RESPONSE");
  console.log(`\n  ${C.green}${C.bold}${response}${C.reset}\n`);

  sep("SUMMARY");
  console.log(`  Total: ${Date.now()-t0}ms | Iterations: ${completedTools.length} | Tools: ${completedTools.join(" → ") || "none"}`);

  // Data preview
  const lastData = allResults[allResults.length - 1]?.result?.data;
  if (Array.isArray(lastData) && lastData.length > 0) {
    console.log(`\n  ${C.cyan}Data (first 3):${C.reset}`);
    lastData.slice(0, 3).forEach(item => {
      const name = `${item.first_name || ""} ${item.last_name || item.name || ""}`.trim();
      console.log(`    • ${name || item.title || item.id} ${item.email ? `<${item.email}>` : ""} ${item.company ? `@ ${item.company}` : ""}`);
    });
    if (lastData.length > 3) console.log(`    ... a ďalších ${lastData.length - 3}`);
  }
  console.log("");
}

// ── ENTRY POINT ───────────────────────────────────────────────────────────────
const userMsg = process.argv.slice(2).join(" ") || "Aké kontakty mám v CRM?";
runAgent(userMsg).catch(err => {
  console.error(`\n${C.red}FATAL ERROR: ${err.message}${C.reset}\n${err.stack}`);
  process.exit(1);
});
