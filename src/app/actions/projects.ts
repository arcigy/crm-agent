'use server';

import directus from '@/lib/directus';
import { readItems, createItem, updateItem } from '@directus/sdk';
import { revalidatePath } from 'next/cache';
import type { Project, ProjectStage } from '@/types/project';

export async function getProjects(): Promise<{ data: Project[] | null; error: string | null }> {
    try {
        // @ts-ignore
        const projects = await directus.request(readItems('projects', {
            filter: {
                deleted_at: { _null: true }
            },
            sort: ['-date_created']
        }));

        return { data: projects as Project[], error: null };
    } catch (e: any) {
        console.error('Failed to fetch projects:', e.message || e);
        return { data: [], error: null }; // Return empty array on failure for robustness
    }
}

export async function createProject(projectData: {
    project_type: string;
    contact_id?: number | null;
    stage?: ProjectStage;
    end_date?: string | null;
}): Promise<{ success: boolean; error?: string }> {
    try {
        // @ts-ignore
        await directus.request(createItem('projects', {
            project_type: projectData.project_type,
            contact_id: projectData.contact_id || null,
            stage: projectData.stage || 'planning',
            end_date: projectData.end_date || null,
            date_created: new Date().toISOString(),
        }));

        revalidatePath('/dashboard/projects');
        return { success: true };
    } catch (e: any) {
        console.error('Failed to create project:', e);
        return { success: false, error: e.message };
    }
}

export async function updateProjectStage(
    projectId: number,
    stage: ProjectStage
): Promise<{ success: boolean; error?: string }> {
    try {
        // @ts-ignore
        await directus.request(updateItem('projects', projectId, {
            stage,
            updated_at: new Date().toISOString()
        }));

        revalidatePath('/dashboard/projects');
        return { success: true };
    } catch (e: any) {
        console.error('Failed to update project stage:', e);
        return { success: false, error: e.message };
    }
}

export async function deleteProject(
    projectId: number
): Promise<{ success: boolean; error?: string }> {
    try {
        // Soft delete - setting status to archived or setting deleted_at
        // @ts-ignore
        await directus.request(updateItem('projects', projectId, {
            deleted_at: new Date().toISOString()
        }));

        revalidatePath('/dashboard/projects');
        return { success: true };
    } catch (e: any) {
        console.error('Failed to delete project:', e);
        return { success: false, error: e.message };
    }
}
