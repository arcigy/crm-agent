'use server';

import directus from '@/lib/directus';
import { readItems, createItem, updateItem } from '@directus/sdk';
import { revalidatePath } from 'next/cache';
import type { Project, ProjectStage } from '@/types/project';
import { currentUser, clerkClient } from '@clerk/nextjs/server';
import { setupProjectStructure } from '@/lib/google-drive';

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
        return { data: [], error: null };
    }
}

export async function createProject(projectData: {
    project_type: string;
    contact_id?: number | null;
    stage?: ProjectStage;
    end_date?: string | null;
    contact_name?: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
        const user = await currentUser();
        if (!user) throw new Error('Unauthorized');

        // 1. Create Project in Directus first
        // @ts-ignore
        const newProject = (await directus.request(createItem('projects', {
            project_type: projectData.project_type,
            contact_id: projectData.contact_id || null,
            contact_name: projectData.contact_name || 'Neznámy',
            stage: projectData.stage || 'planning',
            end_date: projectData.end_date || null,
            date_created: new Date().toISOString(),
        }))) as any;

        // 2. Google Drive Automation
        try {
            const client = await clerkClient();
            const tokenResponse = await client.users.getUserOauthAccessToken(user.id, 'oauth_google');
            const token = tokenResponse.data[0]?.token;

            if (token) {
                const year = new Date().getFullYear().toString();

                // Get count for this year to generate number (e.g. 001, 002)
                // @ts-ignore
                const yearProjects = await directus.request(readItems('projects', {
                    filter: {
                        date_created: { _between: [`${year}-01-01`, `${year}-12-31`] }
                    },
                    limit: -1
                }));
                const projectNumber = (yearProjects as any[]).length.toString().padStart(3, '0');

                const driveFolderId = await setupProjectStructure(token, {
                    projectName: projectData.project_type,
                    projectNumber,
                    year,
                    contactName: projectData.contact_name || 'Neznámy'
                });

                // Update project with folder ID
                // @ts-ignore
                await directus.request(updateItem('projects', newProject.id, {
                    drive_folder_id: driveFolderId
                }));

                newProject.drive_folder_id = driveFolderId;
            }
        } catch (driveErr) {
            console.error('Google Drive sync failed, but project was created:', driveErr);
        }

        revalidatePath('/dashboard/projects');
        revalidatePath('/dashboard/contacts');
        return { success: true, data: newProject };
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
        revalidatePath('/dashboard/contacts');
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
        // @ts-ignore
        await directus.request(updateItem('projects', projectId, {
            deleted_at: new Date().toISOString()
        }));

        revalidatePath('/dashboard/projects');
        revalidatePath('/dashboard/contacts');
        return { success: true };
    } catch (e: any) {
        console.error('Failed to delete project:', e);
        return { success: false, error: e.message };
    }
}
