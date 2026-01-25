'use server';

import directus from '@/lib/directus';
import { readItems, createItem } from '@directus/sdk';
import { getGmailClient, getCalendarClient, refreshAccessToken } from '@/lib/google';
import { revalidatePath } from 'next/cache';

// ==========================================
// 1. CRM ACTIONS (Directus)
// ==========================================

export async function agentCreateContact(data: { name: string; email: string; company?: string; phone?: string }) {
    try {
        // Split name
        const parts = data.name.trim().split(' ');
        const firstName = parts[0];
        const lastName = parts.slice(1).join(' ') || '';

        // Check duplicates via Directus
        // @ts-ignore
        const existing = await directus.request(readItems('contacts', {
            filter: { email: { _eq: data.email } },
            limit: 1
        }));

        if (existing && existing.length > 0) {
            return { success: false, error: 'Contact already exists', contactId: existing[0].id };
        }

        // @ts-ignore
        const contact = await directus.request(createItem('contacts', {
            first_name: firstName,
            last_name: lastName,
            email: data.email,
            company: data.company || null,
            phone: data.phone || null,
            status: 'lead',
        }));

        revalidatePath('/dashboard/contacts');
        return { success: true, contact };

    } catch (error: any) {
        console.error('Agent CreateContact Error:', error);
        return { success: false, error: error.message };
    }
}

export async function agentCreateDeal(data: { name: string; value: number; stage: string; contact_email?: string }) {
    try {
        let contactId = null;

        // Try to find contact if email provided
        if (data.contact_email) {
            // @ts-ignore
            const contacts = await directus.request(readItems('contacts', {
                filter: { email: { _eq: data.contact_email } },
                limit: 1
            }));
            if (contacts && contacts.length > 0) contactId = contacts[0].id;
        }

        // Map Agent "stage" to DB "stage"
        let dbStage = 'planning';
        if (data.stage === 'negotiation') dbStage = 'in_progress';
        if (data.stage === 'won' || data.stage === 'closed') dbStage = 'completed';

        // @ts-ignore
        const project = await directus.request(createItem('projects', {
            project_type: data.name,
            stage: dbStage,
            contact_id: contactId,
        }));

        revalidatePath('/dashboard/projects');
        return { success: true, deal: project };

    } catch (error: any) {
        console.error('Agent CreateDeal Error:', error);
        return { success: false, error: error.message };
    }
}

// ==========================================
// 2. CALENDAR ACTIONS (Google)
// ==========================================

export async function agentCheckAvailability(timeRange: string) {
    try {
        // TODO: Implement Google token storage in Directus
        // For now, return error that calendar is not connected
        return { success: false, error: 'Google Calendar integration pending Directus migration' };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function agentScheduleEvent(data: { title: string; start_time: string; duration_min: number }) {
    try {
        // TODO: Implement Google token storage in Directus
        return { success: false, error: 'Google Calendar integration pending Directus migration' };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ==========================================
// 3. EMAIL ACTIONS (Gmail)
// ==========================================

export async function agentSendEmail(data: { recipient: string; subject: string; body_html: string; threadId?: string }) {
    try {
        // TODO: Implement Google token storage in Directus
        return { success: false, error: 'Gmail integration pending Directus migration' };

    } catch (error: any) {
        console.error('Agent SendEmail Error:', error);
        return { success: false, error: error.message };
    }
}
