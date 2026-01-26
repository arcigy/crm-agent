import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const { content, messageId } = await req.json();

        console.log(`[AI Classify] Received request for msg: ${messageId}, content length: ${content?.length || 0}`);

        if (!process.env.OPENAI_API_KEY) {
            console.error('[AI Classify] CRITICAL ERROR: OPENAI_API_KEY is missing in environment variables!');
            return NextResponse.json({
                success: false,
                error: 'Server nemá nastavený OpenAI API Key. Pridajte kľúč do Railway Environment Variables.'
            });
        }

        if (!content || content.length < 5) {
            return NextResponse.json({ success: false, error: 'Chýba obsah na analýzu alebo je príliš krátky' });
        }

        const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const { object } = await generateObject({
            model: openai('gpt-4o-mini'),
            schema: z.object({
                intent: z.enum(['dopyt', 'otazka', 'problem', 'faktura', 'spam', 'ine']),
                priority: z.enum(['vysoka', 'stredna', 'nizka']),
                sentiment: z.enum(['pozitivny', 'neutralny', 'negativny']),
                service_category: z.string(),
                estimated_budget: z.string(),
                next_step: z.string(),
                summary: z.string(),
                deadline: z.string().optional(),
            }),
            prompt: `
                Analyzuj nasledujúci text emailu a extrahuj kľúčové informácie pre CRM agenta.
                Odpovedaj v slovenskom jazyku. 
                
                Kritériá:
                - intent: Čo odosielateľ chce? (dopyt, otazka, problem, faktura, spam, ine)
                - priority: Aké je to súrne? (vysoka, stredna, nizka)
                - sentiment: Aká je nálada? (pozitivny, neutralny, negativny)
                - service_category: Akého typu služby sa to týka? (napr. Web Design, SEO, Konzultácia...) - ak nevieš, daj "—"
                - estimated_budget: Ak sa spomínajú peniaze, extrahuj sumu. Inak "Neznámy".
                - next_step: Čo by mal užívateľ urobiť ako ďalšie?
                - summary: Stručné zhrnutie (1-2 vety).
                
                Text emailu:
                """
                ${content}
                """
            `,
        });

        return NextResponse.json({ success: true, classification: object });
    } catch (error: any) {
        console.error('AI Classification Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
