'use server';

import directus from '@/lib/directus';
import { readItems, createItem, updateItem, deleteItem } from '@directus/sdk';
import { revalidatePath, unstable_noStore } from 'next/cache';
import { getUserEmail } from '@/lib/auth';

const COLLECTION = 'google_maps_jobs';
const APP_PATH = '/dashboard/outreach/google-maps';

export interface ScrapeJob {
    id: string;
    search_term: string;
    location: string;
    limit: number;
    status: 'queued' | 'processing' | 'paused' | 'completed' | 'cancelled';
    found_count: number;
    owner_email: string;
    date_created: string;
    current_city_index?: number;
    next_page_token?: string;
    last_error?: string | null;
    target_list?: string;
}

export async function getScrapeJobs(): Promise<ScrapeJob[]> {
    unstable_noStore();
    try {
        const email = await getUserEmail();
        if (!email) return [];

        const items = await directus.request(readItems(COLLECTION, {
            fields: ['*'],
            filter: {
                owner_email: { _eq: email }
            },
            sort: ['-date_created']
        }));

        return items as any[] as ScrapeJob[];
    } catch (error) {
        console.error("Error fetching scrape jobs:", error);
        return [];
    }
}

export async function createScrapeJob(job: Partial<ScrapeJob>) {
    try {
        const email = await getUserEmail();
        if (!email) throw new Error("Musíte byť prihlásený.");

        const result = await directus.request(createItem(COLLECTION, {
            ...job,
            owner_email: email,
            status: job.status || 'queued',
            found_count: job.found_count || 0,
            date_created: new Date().toISOString()
        }));

        revalidatePath(APP_PATH);
        return { success: true, id: (result as any).id };
    } catch (error: any) {
        console.error("Error creating scrape job:", error);
        return { success: false, error: error.message };
    }
}

export async function updateScrapeJob(id: string, updates: Partial<ScrapeJob>) {
    try {
        await directus.request(updateItem(COLLECTION, id, updates));
        revalidatePath(APP_PATH);
        return { success: true };
    } catch (error: any) {
        console.error("Error updating scrape job:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteScrapeJob(id: string) {
    try {
        await directus.request(deleteItem(COLLECTION, id));
        revalidatePath(APP_PATH);
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting scrape job:", error);
        return { success: false, error: error.message };
    }
}

export async function getJobLeads(jobId: string) {
    unstable_noStore();
    try {
        const items = await directus.request(readItems('cold_leads', {
            filter: {
                google_maps_job_id: { _eq: jobId }
            },
            limit: 100,
            sort: ['-date_created']
        }));
        
        return items;
    } catch (error) {
        console.error("Error fetching job leads:", error);
        return [];
    }
}
