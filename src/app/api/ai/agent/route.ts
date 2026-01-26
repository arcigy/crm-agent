import { createOpenAI } from '@ai-sdk/openai';
import { streamText, tool as aiTool } from 'ai';
import { z } from 'zod';
import { getMemories, saveNewMemories } from '@/lib/memory';
import {
    agentCreateContact,
    agentCreateDeal
} from '@/app/actions/agent';

// Force dynamic needed to prevent build-time execution of OpenAI client check
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow 60 seconds for execution

const contactParams = z.object({
    name: z.string(),
    email: z.string(),
    company: z.string().optional(),
    phone: z.string().optional(),
});

const dealParams = z.object({
    name: z.string(),
    value: z.number(),
    stage: z.string(),
    contact_email: z.string().optional(),
});

const availabilityParams = z.object({
    time_range: z.string()
});

export async function POST(req: Request) {
    const { messages, userEmail } = await req.json();

    if (!userEmail) {
        return new Response('User email required for memory', { status: 400 });
    }

    // Initialize OpenAI client inside the handler 
    // or use a custom instance if needed to avoid top-level issues
    const openai = createOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    // 1. Load Long-Term Memory
    const memoryContext = await getMemories(userEmail);

    const systemPrompt = `
    You are an advanced CRM AI Assistant. Use the available tools to help the user manage their business.
    
    ${memoryContext}
    
    Instructions:
    - If the user asks to do something (create contact, schedule meeting), CALL THE TOOL. Do not just say you will do it.
    - Be proactive. If you see a deal opportunity in an email draft, suggest creating a Deal.
    - Keep responses professional but conversational.
    - If you learn something new about the user (e.g. they tell you their role, or preference), acknowledge it subtly.
    `;

    // 2. Main Agent Execution
    const result = streamText({
        model: openai('gpt-4o-mini'),
        system: systemPrompt,
        messages: messages,
        tools: {
            create_contact: aiTool({
                description: 'Create a new contact in CRM',
                parameters: contactParams,
                execute: async (params) => {
                    const res = await agentCreateContact(params);
                    return res.success ? `Contact created: ${res.contact?.id}` : `Error: ${res.error}`;
                }
            }),
            create_deal: aiTool({
                description: 'Create a new deal/project in CRM',
                parameters: dealParams,
                execute: async (params) => {
                    const res = await agentCreateDeal(params);
                    return res.success ? `Deal created: ${res.deal?.id}` : `Error: ${res.error}`;
                }
            }),
            check_availability: aiTool({
                description: 'Check calendar availability',
                parameters: availabilityParams,
                execute: async (params) => "Calendar check temporarily disabled during migration."
            })
        },
        onFinish: async ({ text }) => {
            // 3. The "Memorize" Step (Background)
            const lastUserMsg = messages[messages.length - 1];
            if (lastUserMsg.role === 'user') {
                saveNewMemories(userEmail, lastUserMsg.content, text).catch(err => console.error('Memory saving error:', err));
            }
        }
    });

    return (result as any).toDataStreamResponse();
}
