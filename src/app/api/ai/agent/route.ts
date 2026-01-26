import { createOpenAI } from '@ai-sdk/openai';
import { streamText, tool as aiTool } from 'ai';
import { z } from 'zod';
import { getMemories, saveNewMemories } from '@/lib/memory';
import { currentUser, clerkClient } from '@clerk/nextjs/server';
import { google } from 'googleapis';
import {
    agentCreateContact,
    agentCreateDeal
} from '@/app/actions/agent';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
    const { messages } = await req.json();
    const user = await currentUser();
    const userEmail = user?.emailAddresses[0]?.emailAddress;

    if (!userEmail || !user) {
        return new Response('Unauthorized', { status: 401 });
    }

    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const memoryContext = await getMemories(userEmail);

    const systemPrompt = `
    You are an advanced CRM AI Assistant. Use the available tools to help the user manage their business.
    
    Current User: ${userEmail}
    ${memoryContext}
    
    If you need to know about the user's schedule, call 'check_availability'.
    If the user asks about files or documents, you can view them via Google Drive tools.
    `;

    const result = streamText({
        model: openai('gpt-4o-mini'),
        system: systemPrompt,
        messages: messages,
        tools: {
            check_availability: aiTool({
                description: 'Check user calendar for busy/free times',
                parameters: z.object({ days: z.number().default(1) }),
                execute: async ({ days }) => {
                    try {
                        const client = await clerkClient();
                        const response = await client.users.getUserOauthAccessToken(user.id, 'oauth_google');
                        const token = response.data[0]?.token;

                        if (!token) return "Google account not linked. Ask user to connect Google in CRM.";

                        const auth = new google.auth.OAuth2();
                        auth.setCredentials({ access_token: token });
                        const calendar = google.calendar({ version: 'v3', auth });

                        const timeMin = new Date().toISOString();
                        const timeMax = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

                        const res = await calendar.events.list({
                            calendarId: 'primary',
                            timeMin,
                            timeMax,
                            singleEvents: true,
                            orderBy: 'startTime'
                        });

                        const events = res.data.items || [];
                        if (events.length === 0) return "User has no meetings scheduled in this period.";

                        return events.map(e => `${e.summary} (${e.start?.dateTime || e.start?.date} to ${e.end?.dateTime || e.end?.date})`).join('\n');
                    } catch (err: any) {
                        return `Error checking calendar: ${err.message}`;
                    }
                }
            }),
            create_contact: aiTool({
                description: 'Create a new contact in CRM',
                parameters: z.object({ name: z.string(), email: z.string(), phone: z.string().optional() }),
                execute: async (p) => {
                    const res = await agentCreateContact(p);
                    return res.success ? `Contact created: ${res.contact?.id}` : `Error: ${res.error}`;
                }
            }),
            create_deal: aiTool({
                description: 'Create a new deal',
                parameters: z.object({ name: z.string(), value: z.number(), stage: z.string() }),
                execute: async (p) => {
                    const res = await agentCreateDeal(p);
                    return res.success ? `Deal created: ${res.deal?.id}` : `Error: ${res.error}`;
                }
            })
        },
        onFinish: async ({ text }) => {
            const lastMsg = messages[messages.length - 1];
            if (lastMsg.role === 'user') saveNewMemories(userEmail, lastMsg.content, text).catch(e => console.error(e));
        }
    });

    return (result as any).toDataStreamResponse();
}
