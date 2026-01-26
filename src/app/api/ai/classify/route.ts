import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 45; // Increase timeout for AI

export async function POST(req: Request) {
    try {
        const { content, messageId } = await req.json();

        console.log(`[AI Classify] Request for: ${messageId} | Length: ${content?.length}`);

        if (!process.env.OPENAI_API_KEY) {
            console.error('[AI Classify] MISSING API KEY');
            return NextResponse.json({
                success: false,
                error: 'Chýba OpenAI API kľúč v nastaveniach Railway (Environment Variables).'
            }, { status: 500 });
        }

        if (!content || content.length < 5) {
            return NextResponse.json({ success: false, error: 'Email je príliš krátky na analýzu.' });
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
                summary: z.string()
            }),
            prompt: `Analyzuj email a vráť štruktúrované JSON dáta v slovenčine. 
            Zámer: dopyt, otazka, problem, faktura, spam, ine.
            Priorita: vysoka, stredna, nizka.
            Kategória: napr. Montáž, Revízia, Servis...
            Rozpočet: Suma ak je, inak "Neznámy".
            
            Obsah: ${content.substring(0, 4000)}`,
        });

        console.log('[AI Classify] Success:', object.intent);
        return NextResponse.json({ success: true, classification: object });

    } catch (error: any) {
        console.error('[AI Classify] Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Chyba pri komunikácii s AI.'
        }, { status: 500 });
    }
}
