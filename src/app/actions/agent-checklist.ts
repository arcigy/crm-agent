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
Rozlož komplexnú misiu na logické kroky. Každý krok = jedna atomická akcia.

PRAVIDLÁ:
- Maximálne 5 krokov
- Každý krok má: id, description (slovensky), expectedTool, dependsOn
- Krok môže závisieť od predchádzajúceho (dependsOn: ["krok_1"])
- Buď konkrétny: "Vytvoriť kontakt Tomáš Bezák" nie "Vytvoriť kontakt"

AVAILABLE TOOLS:
${toolsDocs}

MISSION BRIEF:
${orchestratorBrief}

Recent Conversation:
${messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n")}

OUTPUT FORMAT (strict JSON array):
[
  {
    "id": "krok_1",
    "description": "Popis akcie po slovensky",
    "expectedTool": "tool_name",
    "dependsOn": []
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
