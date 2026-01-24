import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { classifyEmail } from '@/app/actions/ai';

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { content, messageId } = await req.json();

        if (!content || !messageId) {
            return NextResponse.json({ error: 'Content and messageId required' }, { status: 400 });
        }

        // 1. Check if analysis exists
        const { data: existing } = await supabase
            .from('email_analysis')
            .select('*')
            .eq('message_id', messageId)
            .single();

        if (existing) {
            return NextResponse.json({ success: true, classification: existing, cached: true });
        }

        let classification;

        // --- STRICT CODE: HEURISTIC PRE-FILTER ---
        const lowerContent = content.toLowerCase();
        const spamKeywords = [
            'unsubscribe', 'odhlásiť sa', 'reklama', 'marketing',
            'prijímanie správ', 'odobrať z odberu', 'zobraziť v prehliadači',
            'view in browser', 'click here to unsubscribe'
        ];
        const isHeuristicSpam = spamKeywords.some(word => lowerContent.includes(word));

        if (isHeuristicSpam) {
            classification = {
                intent: 'spam',
                priority: 'nizka',
                sentiment: 'neutralny',
                service_category: '—',
                estimated_budget: '—',
                next_step: '—',
                summary: 'Heuristický filter: Newsletter/Marketing',
                deadline: null
            };
        } else {
            classification = await classifyEmail(content);
        }

        // 2. Save result to DB (Upsert to prevent duplicates)
        if (classification) {
            const { error: saveError } = await supabase.from('email_analysis').upsert([{
                message_id: messageId,
                ...classification,
                updated_at: new Date().toISOString()
            }], { onConflict: 'message_id' });

            if (saveError) console.error('DB Save Error:', saveError);
        }

        return NextResponse.json({ success: true, classification });

    } catch (error: any) {
        console.error('AI Classification API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
