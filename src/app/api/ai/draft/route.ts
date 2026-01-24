import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
    try {
        const { originalContent, nextStep, senderName, messageId } = await request.json();
        const supabase = await createClient();

        // 1. Check DB cache first (Zero Token Cost)
        const { data: existing } = await supabase
            .from('email_analysis')
            .select('draft_reply')
            .eq('message_id', messageId)
            .single();

        if (existing?.draft_reply) {
            console.log('Returning cached draft for:', messageId);
            return NextResponse.json({ success: true, draft: existing.draft_reply, cached: true });
        }

        // 2. Generate Draft (Cost Tokens)
        // TODO: Replace with real AI call: const text = await generateText(prompt);

        // MOCK GENERATOR (Temporarily used to save tokens during development)
        let generatedDraft = '';
        if (nextStep.toLowerCase().includes('call') || nextStep.toLowerCase().includes('schôdz')) {
            generatedDraft = `Dobrý deň ${senderName},\n\nĎakujem za vašu správu. Rád by som si s vami prešiel detaily vášho projektu, aby sme sa uistili, že navrhneme to najlepšie riešenie.\n\nMáte čas na krátky hovor tento týždeň? Hodilo by sa mi to napríklad v stredu o 10:00 alebo vo štvrtok poobede.\n\nDajte mi vedieť, čo vám vyhovuje.\n\nS pozdravom,\n\n[Tvoje Meno]`;
        } else if (nextStep.toLowerCase().includes('cenn') || nextStep.toLowerCase().includes('offer')) {
            generatedDraft = `Dobrý deň ${senderName},\n\nĎakujem za prejavený záujem. Na základe vašich požiadaviek som pre vás pripravil predbežnú kalkuláciu.\n\nBoli by ste otvorený krátkej konzultácii, kde by som vám vysvetlil jednotlivé položky a možnosti optimalizácie rozpočtu?\n\nS pozdravom,\n\n[Tvoje Meno]`;
        } else {
            generatedDraft = `Dobrý deň ${senderName},\n\nPotvrdzujem prijatie vášho e-mailu. Ďakujem za informácie.\n\nBudem sa tomu venovať a ozvem sa vám najneskôr do zajtra s ďalšími krokmi.\n\nS pozdravom,\n\n[Tvoje Meno]`;
        }

        // 3. Save to DB (Persistent Cache)
        const { error: updateError } = await supabase
            .from('email_analysis')
            .update({ draft_reply: generatedDraft })
            .eq('message_id', messageId);

        if (updateError) {
            console.error('Failed to cache draft:', updateError);
        }

        return NextResponse.json({ success: true, draft: generatedDraft, cached: false });

    } catch (error) {
        console.error('Draft error:', error);
        return NextResponse.json({ error: 'Failed to generate draft' }, { status: 500 });
    }
}
