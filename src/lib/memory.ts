import { OpenAI } from 'openai';
import directus from '@/lib/directus';
import { createItem, readItems, deleteItem } from '@directus/sdk';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Získa všetky spomienky pre daného užívateľa vo formáte stringu pre System Prompt
 */
export async function getMemories(userEmail: string): Promise<string> {
    try {
        // @ts-ignore
        const memories = await directus.request(readItems('ai_memories', {
            filter: { user_email: { _eq: userEmail } },
            sort: ['-date_created'], // Najnovšie prvé, ale pre prompt možno lepšie logické
            limit: 50
        }));

        if (!memories || memories.length === 0) return "";

        const memoryList = memories.map((m: any) => `- ${m.fact}`).join('\n');
        return `\n\nCORE MEMORIES (What you know about the user):\n${memoryList}\n(Use these facts to personalize your response, but do not explicitly mention you are reading from memory unless relevant)`;

    } catch (error) {
        console.error('Failed to fetch memories:', error);
        return "";
    }
}

/**
 * "Reflexívna Slučka" - Analyzuje konverzáciu a ukladá nové fakty
 * Táto funkcia by mala bežať na pozadí (fire & forget) po odoslaní odpovede
 */
export async function saveNewMemories(userEmail: string, lastUserMessage: string, assistantResponse: string) {
    try {
        console.log('🧠 Analyzing conversation for new memories...');

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

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Stačí menší model pre extrakciu
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `User: ${lastUserMessage}\nAssistant: ${assistantResponse}` }
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
                                    items: { type: "string", description: "A new fact to remember" }
                                }
                            },
                            required: ["new_facts"]
                        }
                    }
                }
            ],
            tool_choice: "auto"
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
                            await directus.request(createItem('ai_memories', {
                                user_email: userEmail,
                                fact: fact,
                                category: 'fact', // Mohli by sme nechať AI kategorizovať
                                confidence: 100
                            }));
                        }
                    }
                }
            }
        }

    } catch (error) {
        console.error('Memory Architect failed:', error);
    }
}
