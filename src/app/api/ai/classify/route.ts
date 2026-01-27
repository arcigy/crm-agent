import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { classifyEmail } from '@/app/actions/ai';

export const dynamic = 'force-dynamic';
export const maxDuration = 45; // Increase timeout for AI

export async function POST(req: Request) {
    try {
        const { content, messageId, sender } = await req.json();
        const user = await currentUser();
        const userEmail = user?.emailAddresses[0]?.emailAddress;

        console.log(`[AI Classify] Request for: ${messageId} | Length: ${content?.length} | Sender: ${sender} | User: ${userEmail}`);

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

        // Call the centralized action which handles dynamic system prompts
        // We pass sender. Subject is not usually in this lightweight payload but we can treat it as part of content if needed, 
        // or just pass undefined for now.
        const classification = await classifyEmail(content, userEmail || undefined, sender);

        if (!classification) {
            return NextResponse.json({ success: false, error: 'AI analýza zlyhala.' }, { status: 500 });
        }

        console.log('[AI Classify] Success:', classification.intent, '| Priority:', classification.priority);
        return NextResponse.json({ success: true, classification });

    } catch (error: any) {
        console.error('[AI Classify] Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Chyba pri komunikácii s AI.'
        }, { status: 500 });
    }
}
