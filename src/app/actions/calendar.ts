'use server';

import directus from '@/lib/directus';
import { readItems } from '@directus/sdk';
import { getCalendarClient, refreshAccessToken } from '@/lib/google';

export async function getCalendarConnectionStatus() {
    // TODO: Implement Google token storage in Directus
    return { isConnected: false };
}

export async function getCalendarEvents(timeMin?: string, timeMax?: string) {
    try {
        const { currentUser } = await import('@clerk/nextjs/server');
        const user = await currentUser();
        const userEmail = user?.emailAddresses[0]?.emailAddress;

        // 1. Fetch Projects & Contacts from Directus
        // @ts-ignore
        const projectData = await directus.request(readItems('projects', {
            filter: { deleted_at: { _null: true } },
            limit: -1
        }));

        // @ts-ignore
        const contactsData = await directus.request(readItems('contacts', {
            limit: -1
        }));

        // @ts-ignore
        const tasksData = userEmail ? await directus.request(readItems('crm_tasks', {
            filter: { user_email: { _eq: userEmail } },
            limit: -1
        })) : [];

        const allEvents: any[] = [];

        // --- Process Projects ---
        if (projectData) {
            // @ts-ignore
            for (const p of projectData) {
                const contact = (contactsData as any[])?.find(c => String(c.id) === String(p.contact_id));
                const contactName = contact ? `${contact.first_name} ${contact.last_name}` : 'Neznámy';

                // Add creation date event
                allEvents.push({
                    id: `p-start-${p.id}`,
                    title: `🚀 START: ${p.project_type}`,
                    description: `Nový projekt pre ${contactName}.\nŠtádium: ${p.stage}`,
                    start: new Date(p.date_created),
                    end: new Date(new Date(p.date_created).getTime() + 60 * 60 * 1000),
                    allDay: false,
                    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                    meta: { type: 'project', id: p.id, contactId: p.contact_id }
                });

                // Add end date event
                if (p.end_date) {
                    allEvents.push({
                        id: `p-end-${p.id}`,
                        title: `🏁 DEADLINE: ${p.project_type}`,
                        description: `Termín pre ${contactName}.\nStatus: ${p.stage}`,
                        start: new Date(p.end_date),
                        end: new Date(new Date(p.end_date).getTime() + 60 * 60 * 1000),
                        allDay: true,
                        color: 'bg-rose-50 text-rose-700 border-rose-200 font-bold',
                        meta: { type: 'project', id: p.id, contactId: p.contact_id }
                    });
                }
            }
        }

        // --- Process Tasks ---
        if (tasksData) {
            // @ts-ignore
            for (const t of tasksData) {
                const taskDate = t.due_date || t.date_created;
                if (taskDate) {
                    allEvents.push({
                        id: `t-${t.id}`,
                        title: `📝 TODO: ${t.title}`,
                        description: `Úloha z tvojho zoznamu.\nStav: ${t.completed ? 'Hotovo' : 'Prebieha'}`,
                        start: new Date(taskDate),
                        end: new Date(new Date(taskDate).getTime() + 30 * 60 * 1000),
                        allDay: !!t.due_date, // If it's a deadline, maybe it's all day
                        color: t.completed ? 'bg-gray-50 text-gray-400 border-gray-200' : 'bg-amber-50 text-amber-700 border-amber-200',
                        meta: { type: 'task', id: t.id }
                    });
                }
            }
        }

        return {
            success: true,
            events: allEvents,
            isConnected: false // Google calendar not connected yet
        };
    } catch (error: any) {
        console.error('Calendar Fetch Error:', error);
        return { success: false, error: error.message };
    }
}

export async function disconnectGoogle() {
    // TODO: Implement Google token storage in Directus
    return { success: true };
}

export async function createCalendarEvent(eventData: {
    summary: string;
    description?: string;
    start: string;
    end: string;
    location?: string;
}) {
    // TODO: Implement Google Calendar integration with Directus
    return { success: false, error: 'Google Calendar integration pending Directus migration' };
}
