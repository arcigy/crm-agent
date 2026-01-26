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

        // Pre-classification for obvious automated emails
        const isNoReply = /no-reply|noreply|notification|alert/i.test(content) || /no-reply|accounts\.google\.com/i.test(messageId || '');

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
            prompt: `
                Úloha: Klasifikuj prichádzajúci email pre CRM systém. 
                BUĎ VEĽMI PRÍSNY PRI URČOVANÍ PRIORITY.
                
                PRAVIDLÁ PRIORITY:
                - VYSOKÁ (vysoka): Len vtedy, ak píše SKUTOČNÝ ŽIVÝ KLIENT, ktorý má jasný záujem o službu, pýta sa na cenovú ponuku alebo má urgentný biznis problém.
                - STREDNÁ (stredna): Bežné otázky od známych kontaktov, faktúry na úhradu.
                - NÍZKA (nizka): Automatické správy, bezpečnostné upozornenia (Google, banka), potvrdenia o registrácii, informačné maily.
                - SPAM (spam): Reklamy, newslettery, nevyžiadané ponuky, maily z noreply adries, ktoré nevyžadujú akciu.
                
                ŠPECIÁLNY POKYN: 
                - Ak je odosielateľ Google, Facebook alebo iná služba a ide o "Bezpečnostné upozornenie" alebo "Prístup k údajom", klasifikuj to ako intent 'ine' a prioritu 'nizka' alebo 'spam'. Nikdy nie vysoká!
                - Ak zistíš, že ide o SPAM, zhrnutie (summary) napíš veľmi krátko.
                
                Obsah emailu na analýzu:
                """
                ${content.substring(0, 4000)}
                """
            `,
        });

        // Manual override if AI fails to see obvious noreply patterns as low priority
        if (isNoReply && object.priority === 'vysoka') {
            object.priority = 'nizka';
        }

        console.log('[AI Classify] Success:', object.intent, '| Priority:', object.priority);
        return NextResponse.json({ success: true, classification: object });

    } catch (error: any) {
        console.error('[AI Classify] Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Chyba pri komunikácii s AI.'
        }, { status: 500 });
    }
}
