import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
    console.log('Checking for unconfirmed users...');

    // Dynamic import to ensure env vars are loaded first
    const { supabaseAdmin } = await import('../src/lib/supabase-admin');

    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
        console.error('Error listing users:', error);
        return;
    }

    const unconfirmedUsers = users.filter((u) => !u.email_confirmed_at);

    if (unconfirmedUsers.length === 0) {
        console.log('No unconfirmed users found.');
        return;
    }

    console.log(`Found ${unconfirmedUsers.length} unconfirmed users.`);

    for (const user of unconfirmedUsers) {
        console.log(`Confirming email for: ${user.email}`);
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            user.id,
            { email_confirm: true }
        );

        if (updateError) {
            console.error(`Failed to confirm ${user.email}:`, updateError);
        } else {
            console.log(`Successfully confirmed ${user.email}`);
        }
    }
}

main();
