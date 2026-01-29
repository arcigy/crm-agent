import { OpenAI } from "openai";
import directus from "@/lib/directus";
import { createItem, readItems, deleteItem } from "@directus/sdk";

// REMOVE global initialization to fix build failure
// const openai = new OpenAI({...});

// Helper to get client securely
function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

import { getIsolatedAIContext } from "./ai-context";

/**
 * Získa všetky spomienky a personalizáciu pre daného užívateľa vo formáte stringu pre System Prompt
 */
export async function getMemories(userEmail: string): Promise<string> {
  try {
    const context = await getIsolatedAIContext(userEmail, "GLOBAL");

    const segments = [
      `### IDENTITA POUŽÍVATEĽA`,
      `- Oslovuj ma: ${context.user_nickname}`,
      `- Moja rola: ${context.user_profession}`,
      context.user_about_me ? `- O mne: ${context.user_about_me}` : "",
      "",
      `### FIRMA & BIZNIS`,
      `- Názov: ${context.business_company_name}`,
      `- Odvetvie: ${context.business_industry}`,
      `- Služby: ${context.business_services}`,
      `- Ciele: ${context.business_goals}`,
      "",
      `### AI PREFERENCIE`,
      `- Tón: ${context.communication_tone}`,
      `- Fokus: ${context.ai_focus_areas}`,
      "",
      "### LEARNED FACTS (Kľúčové informácie)",
      ...context.learned_memories.map((m) => `- ${m}`),
    ];

    return segments.filter(Boolean).join("\n");
  } catch (error) {
    console.error("Failed to fetch memories:", error);
    return "";
  }
}

/**
 * Získa špecifický System Prompt z pamäte (ak existuje), inak vráti null
 */
export async function getSystemPrompt(
  userEmail: string,
  promptType: string = "email_analysis",
): Promise<string | null> {
  try {
    // @ts-ignore
    const prompts = await directus.request(
      readItems("ai_memories", {
        filter: {
          user_email: { _eq: userEmail },
          category: { _eq: "system_prompt" },
          fact: { _contains: `[${promptType}]` }, // Convention: "[type] Prompt content..." or we check a 'tags' field if available
        },
        limit: 1,
      }),
    );

    // Fallback: Check for just the category if we use 'fact' content to store the whole prompt
    // Better Convention: Use 'fact' to store the prompt content, and maybe rely on a specific format or just fetch all system prompts and filter in code?
    // Let's assume the USER will save it as: "SYSTEM_PROMPT_EMAIL: You are an analyzer..."
    // Or simpler: We just fetch items with category 'system_prompt_email' if the user allows that category string.

    // Let's try fetching by category 'system_prompt_email' directly if schema allows loose strings
    // @ts-ignore
    const specificPrompts = await directus.request(
      readItems("ai_memories", {
        filter: {
          user_email: { _eq: userEmail },
          category: { _eq: `prompt_${promptType}` },
        },
        limit: 1,
      }),
    );

    if (specificPrompts && specificPrompts.length > 0) {
      return specificPrompts[0].fact;
    }

    return null;
  } catch (error) {
    console.error("Failed to fetch system prompt:", error);
    return null;
  }
}

/**
 * "Reflexívna Slučka" - Analyzuje konverzáciu a ukladá nové fakty
 * Táto funkcia by mala bežať na pozadí (fire & forget) po odoslaní odpovede
 */
export async function saveNewMemories(
  userEmail: string,
  lastUserMessage: string,
  assistantResponse: string,
) {
  try {
    console.log("🧠 Analyzing conversation for new memories...");

    // 1. Získame existujúce spomienky na porovnanie (aby sme neukladali duplicity)
    const currentContext = await getMemories(userEmail);

    // 2. Prompt pre Memory Architecta
    const systemPrompt = `
        You are a generic Memory Architect. Your job is to extract PERMANENT FACTS and USER PREFERENCES from the conversation.
        
        Rules:
        1. Only extract facts that seem useful for the long term (e.g., job title, projects, tone preference, tech stack, personal details).
        2. Do NOT extract trivial details (e.g., "User said hello").
        3. Formulate the fact clearly in 3rd person or general statement (e.g., "User prefers dark mode" not "I prefer dark mode").
        4. If the new fact contradicts an old memory, output a specific instruction to DELETE the old one (if possible), or just formulate the new one.
        5. If nothing new/permanent was learned, return an empty JSON array.
        
        Existing Memories:
        ${currentContext}
        `;

    const openai = getOpenAI(); // Init here

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Stačí menší model pre extrakciu
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `User: ${lastUserMessage}\nAssistant: ${assistantResponse}`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "update_memory",
            description: "Save new facts or preferences",
            parameters: {
              type: "object",
              properties: {
                new_facts: {
                  type: "array",
                  items: {
                    type: "string",
                    description: "A new fact to remember",
                  },
                },
              },
              required: ["new_facts"],
            },
          },
        },
      ],
      tool_choice: "auto",
    });

    const toolCalls = completion.choices[0].message.tool_calls;

    if (toolCalls) {
      // Cast to any to avoid TS union type issues with OpenAI SDK
      for (const toolCall of toolCalls as any[]) {
        if (toolCall.function && toolCall.function.name === "update_memory") {
          const args = JSON.parse(toolCall.function.arguments);
          if (args.new_facts && args.new_facts.length > 0) {
            for (const fact of args.new_facts) {
              console.log(`🧠 Memorizing: ${fact}`);
              // Uložiť do Directus
              // @ts-ignore
              await directus.request(
                createItem("ai_memories", {
                  user_email: userEmail,
                  fact: fact,
                  category: "fact", // Mohli by sme nechať AI kategorizovať
                  confidence: 100,
                }),
              );
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("Memory Architect failed:", error);
  }
}
