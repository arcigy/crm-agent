'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import type { Project, ProjectStage } from '@/types/project';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getProjects(): Promise<{ data: Project[] | null; error: string | null }> {
    try {
        const { data: projects, error } = await supabase
            .from('projects')
            .select('*')
            .is('deleted_at', null)
            .order('date_created', { ascending: false });

        if (error) throw error;

        return { data: projects as Project[], error: null };
    } catch (e: any) {
        // If the table doesn't exist yet (not migrated), return empty array silently
        // 42P01 is Postgres error for undefined_table
        if (e.code === '42P01') {
            return { data: [], error: null };
        }
        console.error('Failed to fetch projects:', e.message || e);
        return { data: null, error: e.message || 'Unknown error' };
    }
}

export async function createProject(projectData: {
    project_type: string;
    contact_id?: number | null;
    stage?: ProjectStage;
    end_date?: string | null;
}): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase
            .from('projects')
            .insert({
                project_type: projectData.project_type,
                contact_id: projectData.contact_id || null,
                stage: projectData.stage || 'planning',
                end_date: projectData.end_date || null,
                date_created: new Date().toISOString(),
            });

        if (error) throw error;

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
        const { error } = await supabase
            .from('projects')
            .update({ stage, updated_at: new Date().toISOString() })
            .eq('id', projectId);

        if (error) throw error;

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
        // Soft delete
        const { error } = await supabase
            .from('projects')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', projectId);

        if (error) throw error;

        revalidatePath('/dashboard/projects');
        return { success: true };
    } catch (e: any) {
        console.error('Failed to delete project:', e);
        return { success: false, error: e.message };
    }
}
