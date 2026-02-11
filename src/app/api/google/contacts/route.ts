import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const user = await currentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const userEmail = user.emailAddresses[0]?.emailAddress;
        const { getValidToken } = await import("@/lib/google");
        const token = await getValidToken(user.id, userEmail);

        if (!token) return NextResponse.json({ isConnected: false, error: 'Google account not linked or token expired' });

        const { getPeopleClient } = await import("@/lib/google");
        const people = await getPeopleClient(token);

        const res = await people.people.connections.list({
            resourceName: 'people/me',
            pageSize: 100,
            personFields: 'names,emailAddresses,phoneNumbers,organizations',
        });

        const contacts = (res.data.connections || []).map(person => {
            const name = person.names?.[0]?.displayName || 'Unknown';
            const email = person.emailAddresses?.[0]?.value || '';
            const phone = person.phoneNumbers?.[0]?.value || '';
            const company = person.organizations?.[0]?.name || '';

            return { name, email, phone, company };
        });

        return NextResponse.json({ isConnected: true, contacts });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
