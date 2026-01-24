'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

export async function createContact(data: any) {
    try {
        const supabase = await createClient();

        // Basic validation
        if (!data.first_name || !data.email) {
            throw new Error('First name and email are required');
        }

        // First check if email already exists
        const { data: existing } = await supabase
            .from('contacts')
            .select('id')
            .eq('email', data.email)
            .single();

        if (existing) {
            return { success: false, error: 'A contact with this email already exists.' };
        }

        const { error } = await supabase
            .from('contacts')
            .insert({
                first_name: data.first_name,
                last_name: data.last_name,
                email: data.email,
                phone: data.phone,
                company: data.company,
                status: data.status,
            });

        if (error) throw error;

        // Revalidate dashboard to show new data
        revalidatePath('/dashboard/contacts');

        return { success: true };
    } catch (error: any) {
        console.error('Failed to create contact:', error);
        // Better error message for unique constraint
        if (error?.message?.includes('duplicate key')) {
            return { success: false, error: 'A contact with this email already exists.' };
        }
        return { success: false, error: error.message || 'Failed to create contact' };
    }
}

export async function updateContactComments(id: number, comments: string) {
    try {
        const supabase = await createClient();

        const { error } = await supabase
            .from('contacts')
            .update({ comments: comments })
            .eq('id', id);

        if (error) throw error;

        revalidatePath('/dashboard/contacts');
        return { success: true };
    } catch (error: any) {
        console.error('Failed to update comments:', error);
        return { success: false, error: error.message };
    }
}
