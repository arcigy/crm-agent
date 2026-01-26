'use server';

import directus from '@/lib/directus';
import { readItems, updateItem } from '@directus/sdk';
import { hashPassword, verifyPassword, createSession } from '@/lib/auth-service';

/**
 * Stage 1: Check if email exists and what is the status
 */
export async function checkEmailStatus(email: string) {
    try {
        // @ts-ignore
        const users = await directus.request(readItems('crm_users', {
            filter: { email: { _eq: email } },
            limit: 1
        }));

        if (!users || users.length === 0) {
            return { status: 'UNKNOWN' };
        }

        const user = users[0];

        if (user.status === 'suspended' || user.status === 'archived') {
            return { status: 'SUSPENDED' };
        }

        // If no password hash, it's a first time login (invited)
        if (!user.password_hash || user.password_hash === "") {
            return { status: 'FIRST_TIME', name: user.first_name };
        }

        return { status: 'ACTIVE', name: user.first_name };

    } catch (error) {
        console.error('Auth Check Error:', error);
        return { status: 'ERROR' };
    }
}

/**
 * Stage 2A: Login for existing users
 */
export async function loginUser(email: string, password: string) {
    try {
        // @ts-ignore
        const users = await directus.request(readItems('crm_users', {
            filter: { email: { _eq: email } },
            limit: 1
        }));

        if (!users || users.length === 0) {
            return { success: false, error: 'User not found' };
        }

        const user = users[0];

        const isValid = await verifyPassword(password, user.password_hash);

        if (!isValid) {
            return { success: false, error: 'Invalid password' };
        }

        // Create Session
        await createSession({
            userId: user.id,
            email: user.email,
            role: user.role,
            name: `${user.first_name} ${user.last_name}`
        });

        return { success: true };

    } catch (error) {
        console.error('Login Error:', error);
        return { success: false, error: 'System error during login' };
    }
}

/**
 * Stage 2B: Onboarding for first-time users (Set Password)
 */
export async function completeOnboarding(email: string, newPassword: string) {
    try {
        // @ts-ignore
        const users = await directus.request(readItems('crm_users', {
            filter: { email: { _eq: email } },
            limit: 1
        }));

        if (!users || users.length === 0) {
            return { success: false, error: 'User not found' };
        }

        const user = users[0];

        // Security check: Only allow setting password if it's empty
        if (user.password_hash && user.password_hash !== "") {
            return { success: false, error: 'Account already set up. Please login normally.' };
        }

        const hashedPassword = await hashPassword(newPassword);

        // Update user
        // @ts-ignore
        await directus.request(updateItem('crm_users', user.id, {
            password_hash: hashedPassword,
            status: 'active',
            date_updated: new Date().toISOString()
        }));

        // Create Session immediately
        await createSession({
            userId: user.id,
            email: user.email,
            role: user.role,
            name: `${user.first_name} ${user.last_name}`
        });

        return { success: true };

    } catch (error) {
        console.error('Onboarding Error:', error);
        return { success: false, error: 'Failed to set password' };
    }
}
