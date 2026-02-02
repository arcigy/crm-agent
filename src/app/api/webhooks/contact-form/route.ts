import { NextResponse } from 'next/server';
import { classifyEmail } from '@/app/actions/ai';
import directus from '@/lib/directus';
import { createItem, readItems } from '@directus/sdk';

export const dynamic = 'force-dynamic';

/**
 * Webhook for external contact forms (websites)
 * Receives data, analyzes with AI, and creates a lead/contact.
 */
export async function POST(req: Request) {
    try {
        const payload = await req.json();

        // Standard fields from common form builders
        const name = payload.name || payload.first_name || 'Neznámy';
        const email = payload.email || payload.sender_email;
        const phone = payload.phone || payload.tel;
        const message = payload.message || payload.note || payload.content || '';
        const subject = payload.subject || 'Dopyt z webovej stránky';
        
        // Target system user for context (mandatory for isolation)
        const target_user = (payload.target_user_email || payload.target_email || "").toLowerCase();

        console.log(`[ContactForm] New submission from: ${email} for user: ${target_user}`);

        if (!email || !message) {
            return NextResponse.json({ error: 'Email and message are required' }, { status: 400 });
        }

        if (!target_user) {
            return NextResponse.json({ error: 'target_user_email is required for multi-tenant isolation' }, { status: 400 });
        }

        // 1. AI Analysis of the form message
        const classification = await classifyEmail(message, target_user, email, subject);

        // 2. Database Operations
        let contactId = null;

        try {
            // Check if contact already exists for THIS specific user
            // @ts-ignore
            const existing = await directus.request(readItems('contacts', {
                filter: { 
                    _and: [
                        { email: { _eq: email } },
                        { user_email: { _eq: target_user } }
                    ]
                },
                limit: 1
            }));

            if (existing && existing.length > 0) {
                contactId = existing[0].id;
            } else {
                // Create new contact tagged with target_user
                // @ts-ignore
                const newContact = await directus.request(createItem('contacts', {
                    first_name: name.split(' ')[0],
                    last_name: name.split(' ').slice(1).join(' ') || '—',
                    email: email,
                    phone: phone,
                    user_email: target_user,
                    status: 'published'
                }));
                contactId = (newContact as any).id;
            }
        } catch (e) {
            console.error('[ContactForm] Contact DB error:', e);
        }

        // 3. Save as Activity / Lead
        try {
            // @ts-ignore
            await directus.request(createItem('activities', {
                type: 'lead',
                subject: subject,
                content: `
Zpráva z webu:
${message}

AI Analýza:
${JSON.stringify(classification, null, 2)}
                `.trim(),
                contact_id: contactId,
                user_email: target_user,
                activity_date: new Date().toISOString(),
                metadata: {
                    source: 'web_form',
                    classification: classification
                }
            }));
        } catch (e) {
            console.error('[ContactForm] Activity DB error:', e);
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Lead processed successfully',
            classification 
        });

    } catch (error: any) {
        console.error('[ContactForm] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
