import { NextResponse } from 'next/server';
import directus from '@/lib/directus';
import { createItem } from '@directus/sdk';

import { currentUser } from '@clerk/nextjs/server';

export async function POST(req: Request) {
    try {
        const user = await currentUser();
        const userEmail = user?.emailAddresses[0]?.emailAddress;
        if (!userEmail) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();

        // Basic validation
        if (!body.first_name || !body.email) {
            return NextResponse.json({ error: 'Meno a email sú povinné' }, { status: 400 });
        }

        // @ts-ignore
        const result = await directus.request(createItem('contacts', {
            first_name: body.first_name,
            last_name: body.last_name,
            email: body.email,
            phone: body.phone,
            company: body.company,
            status: body.status || 'published',
            user_email: userEmail
        }));

        return NextResponse.json({ success: true, result });

    } catch (error: any) {
        console.error('API Contact Create Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
