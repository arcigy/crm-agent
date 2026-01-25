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
        // 1. Fetch Projects from Directus to show them in calendar
        // @ts-ignore
        const projectData = await directus.request(readItems('projects', {
            filter: { deleted_at: { _null: true } },
        }));

        const projectEvents: any[] = [];
        if (projectData) {
            // @ts-ignore
            for (const p of projectData) {
                // Add creation date event
                projectEvents.push({
                    id: `p-start-${p.id}`,
                    title: `🚀 Start: ${p.project_type}`,
                    description: `Nový projekt.\nTyp: ${p.project_type}\nŠtádium: ${p.stage}`,
                    start: new Date(p.date_created),
                    end: new Date(new Date(p.date_created).getTime() + 60 * 60 * 1000),
                    allDay: false,
                    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                    location: 'CRM Projects',
                    type: 'project'
                });

                // Add end date event if exists
                if (p.end_date) {
                    projectEvents.push({
                        id: `p-end-${p.id}`,
                        title: `🏁 Deadline: ${p.project_type}`,
                        description: `Deadline projektu.\nTyp: ${p.project_type}\nŠtádium: ${p.stage}`,
                        start: new Date(p.end_date),
                        end: new Date(new Date(p.end_date).getTime() + 60 * 60 * 1000),
                        allDay: true,
                        color: 'bg-amber-50 text-amber-700 border-amber-200',
                        location: 'CRM Projects',
                        type: 'project'
                    });
                }
            }
        }

        return {
            success: true,
            events: projectEvents,
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
