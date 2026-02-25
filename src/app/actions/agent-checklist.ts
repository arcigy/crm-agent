import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { ChecklistItem, ChatMessage, UserResource } from "./agent-types";
import { ALL_ATOMS } from "./agent-registry";

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

export async function buildMissionChecklist(
   messages: ChatMessage[],
   orchestratorBrief: string
): Promise<ChecklistItem[]> {
    const toolsDocs = ALL_ATOMS.map(t => `- ${t.function.name}: ${t.function.description}`).join("\n");
    const systemPrompt = `
You are the Mission Planner for a Business CRM agent.
Your ONLY job is to analyze the user's intent and break it down into a strict, ordered checklist of actions.

AVAILABLE TOOLS:
${toolsDocs}

MISSION BRIEF:
${orchestratorBrief}

Recent Conversation:
${messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n")}

RULES FOR CHECKLIST:
1. Each item must map to precisely ONE EXPECTED TOOL.
2. Order matters! If creating a project requires a contact, the contact step must come first. Let dependsOn reflect this order.
3. Every item gets a unique ID (e.g., "fetch_contact_1", "create_proj_1").
4. If a tool produces an ID that later tools need, specify resultKey (e.g. "contact_id").
5. Do NOT include minor conversational steps. Only actionable CRM/email interactions.

Respond cleanly with a JSON array of objects. NOTHING ELSE.
[
  {
    "id": "step_1",
    "description": "Nájdi alebo vytvor kontakt Peter Maličký",
    "toolExpected": "db_search_contacts",
    "resultKey": "contact_id",
    "dependsOn": []
  },
  {
    "id": "step_2",
    "description": "Vytvor projekt pre kontakt",
    "toolExpected": "db_create_project",
    "resultKey": "project_id",
    "dependsOn": ["step_1"]
  }
]
`;

    try {
        const { text } = await generateText({
            model: google("gemini-2.5-flash"),
            system: systemPrompt,
            prompt: "Generuj checklist krokov pre túto misiu na základe zadania a dostupných nástrojov.",
            temperature: 0.1,
        });

        // Parse assuming it's a JSON block
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            // Add PENDING status to all items
            return parsed.map((item: any) => ({
                ...item,
                status: "PENDING"
            }));
        }
        return [];
    } catch (err) {
        console.error("Failed to build checklist:", err);
        return [];
    }
}

export function updateChecklistState(checklist: ChecklistItem[], completedTools: string[]): ChecklistItem[] {
    // Highly simplified: mark items DONE if their toolExpected is in completedTools.
    // In reality, this could be more granular, matching exact results.
    const newChecklist = [...checklist];
    for (const item of newChecklist) {
        if (item.status !== "DONE" && completedTools.includes(item.toolExpected)) {
            item.status = "DONE";
        }
    }
    return newChecklist;
}

export function shouldBuildChecklist(goalText: string): boolean {
    const actionVerbs = [
        "vytvor", "pridaj", "pošli", "zmaž", "uprav", "zlúč", "prirad", "vyrieš", "naplánuj",
        "create", "add", "send", "delete", "remove", "update", "merge", "assign", "resolve", "schedule"
    ];
    const lowerGoal = goalText.toLowerCase();
    
    // Count how many distinct action verbs are present
    const distinctVerbsFound = actionVerbs.filter(v => lowerGoal.includes(v));
    const verbCount = distinctVerbsFound.length;
    
    // Signals for multiple actions 
    // We check if " a " or " and " is likely connecting two different items or actions
    const hasMultipleActions = (lowerGoal.includes(" a ") || lowerGoal.includes(" and ") || lowerGoal.includes(","));
    
    // If we have 2 or more distinct verbs, it's definitely a multi-step mission
    if (verbCount >= 2) return true;
    
    // If it's a simple search or fetch request without multiple action verbs, we skip
    if (verbCount <= 1 && goalText.length < 100 && !hasMultipleActions) return false;
    
    return true; 
}
