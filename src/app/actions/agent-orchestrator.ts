"use server";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { ALL_ATOMS } from "./agent-registry";
import { trackAICall } from "@/lib/ai-cost-tracker";

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

export async function orchestrateParams(
  lastUserMessage: string | null,
  conversationHistory: any[]
) {
  const start = Date.now();
  try {
    const toolsDocs = ALL_ATOMS.map((t) => ({
      name: t.function.name,
      description: t.function.description,
      parameters: t.function.parameters,
    }));

    const systemPrompt = `
ROLE:
You are the Supreme AI Orchestrator for a high-stakes Business CRM. You are precision-oriented, logical, and highly cautious. Your purpose is to act as the brain, decomposing user requests into flawless sequences of atomic tool executions.

TASK:
1. Analyze the USER INPUT and the provided CONVERSATION HISTORY.
2. Determine the most efficient and safest path to fulfill the request.
3. Break down the path into discrete "steps" using the AVAILABLE TOOLS.
4. Output a strictly formatted JSON plan.

INPUTS:
1. USER INPUT: The latest message or command from the user.
2. CONVERSATION HISTORY: A summary of the recent 5 messages and tool execution results. You MUST extract IDs and data from here to avoid redundant work.

AVAILABLE TOOLS:
${JSON.stringify(toolsDocs.map(t => ({name: t.name, desc: t.description, params: t.parameters})), null, 2)}

RULES:
1. TRIPLE-CHECK ID VALIDITY: Never guess IDs. If multiple entities (contact, project, etc.) are needed and their IDs aren't in history, plan SEARCHES FOR ALL OF THEM in the first iteration. Use 'db_search_contacts' and 'db_search_projects' accordingly.
2. CRM-FIRST POLICY: Before looking for info externally (Gmail/Web), always check the internal CRM database first using 'db_search_contacts'.
3. SEQUENTIAL DEPENDENCIES: Only block an action if the CURRENT STEP strictly requires an ID you don't have. However, always prioritize gathering ALL necessary IDs in the first step to minimize iterations.
4. ATOMICITY: Each step must be a single tool call with precise arguments as defined in specs.
5. COMPLETION CRITERIA: When the user's objective is fully met, your 'steps' array MUST be empty []. Do not stop until every part of the request is verified as successful.
6. NO REPETITION: NEVER repeat the exact same tool call if it returned '0 results' or 'not found' in the HISTORY. Move to the next logical step or source immediately.
7. FALLBACK CHAIN: If 'db_search_contacts' return 0 results, IMMEDIATELY proceed to 'gmail_fetch_list' or 'web_search_google' if the user's request allows for external search. Do not attempt to search the CRM again in the same task.
8. AGGRESSIVE PROGRESSION: Every iteration MUST bring new information. If you are stuck, ask the user for missing details instead of looping.
9. RICH NOTES: When creating notes (db_create_note), follow these visual standards:
   - TITLE: Keep it clean and human-readable. NEVER use '@Name (ID: X)' or tags in the TITLE.
   - CONTENT: This must be EXTREMELY PREMIUM. 
   - ALWAYS start with a H1 for the main topic.
   - ALWAYS use a CALLOUT for a high-level summary.
   - ALWAYS use BULLET POINTS (UL) for details/tasks.
   - INSERT MENTIONS: Use the format '@Name (ID: X)' ONLY within the body content, where it makes sense.
   - Use COLORS for important metrics, money, or deadlines (e.g., [color:#10b981]Success[/color]).
   - Make the note look like a professional, visually rich report.

SPECIFICS:
This is CRITICAL for the user's career. Mistakes can lead to financial loss or broken business relationships. You MUST be 100% certain of every tool and argument. Accuracy is paramount.

CONTEXT:
You are the master of the ArciGy CRM ecosystem. You have access to Google Workspace, Directus CRM, and Web Search. 

NOTES:
- You ONLY generate JSON PLANS. Do not include conversational text.
- Triple-check everything before outputting the steps. 
- Use ONLY the keys "tool" and "args" in the steps array.

OUTPUT FORMAT (STRICT JSON):
{
  "intent": "action_summary",
  "thought": "Internal reasoning (triple-checked analysis)",
  "steps": [
    { "tool": "tool_name", "args": { "key": "value" } }
  ]
}
`;

    const response = await generateText({
      model: google("gemini-2.0-flash"), // Flash is fast and works reliably
      system: systemPrompt,
      prompt: `HISTORY:\n${JSON.stringify(conversationHistory.slice(-5))}\n\nUSER INPUT:\n${lastUserMessage}`,
    });

    trackAICall(
        "orchestrator",
        "gemini",
        "gemini-2.0-flash",
        systemPrompt + (lastUserMessage || ""),
        response.text,
        Date.now() - start,
        (response.usage as any).inputTokens,
        (response.usage as any).outputTokens
    );

    try {
        let rawText = response.text.trim();
        
        // Find first '{' and last '}'
        const firstBrace = rawText.indexOf('{');
        const lastBrace = rawText.lastIndexOf('}');
        let jsonText = (firstBrace !== -1 && lastBrace !== -1) 
            ? rawText.substring(firstBrace, lastBrace + 1)
            : rawText;

        // Quote bare ??? tokens - handle both comma and closing brace
        jsonText = jsonText
            .replace(/:\s*\?\?\?\s*([,}])/g, ': "???"$1');
            
        try {
            const parsed = JSON.parse(jsonText);
            
            // Normalization
            if (parsed.steps && Array.isArray(parsed.steps)) {
                parsed.steps = parsed.steps.map((s: any) => ({
                    tool: s.tool || s.tool_name || s.name,
                    args: s.args || s.arguments || s.params || {}
                }));
            }
            return parsed;
        } catch (jsonErr: any) {
            console.error("Orchestrator JSON.parse failed on:", jsonText);
            console.error("Error:", jsonErr.message);
            throw jsonErr;
        }
    } catch (e) {
        return {
            intent: "error_parsing",
            thought: "Failed to parse JSON plan after cleanup.",
            steps: []
        };
    }
} catch (error: any) {
    console.error("Orchestrator Fatal Error:", error);
    return {
        intent: "error",
        thought: error.message,
        steps: []
    };
}
}
