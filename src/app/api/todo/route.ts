import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import directus from '@/lib/directus';
import { createItem, readItems, updateItem, deleteItem } from '@directus/sdk';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const user = await currentUser();
        const userEmail = user?.emailAddresses[0]?.emailAddress;
        if (!userEmail) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // @ts-ignore
        const tasks = await directus.request(readItems('crm_tasks', {
            filter: { user_email: { _eq: userEmail } },
            sort: ['-date_created']
        }));

        return NextResponse.json(tasks);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await currentUser();
        const userEmail = user?.emailAddresses[0]?.emailAddress;
        if (!userEmail) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { title } = await req.json();

        // @ts-ignore
        const res = await directus.request(createItem('crm_tasks', {
            title,
            completed: false,
            user_email: userEmail
        }));

        return NextResponse.json(res);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const { id, completed, title } = await req.json();

        // @ts-ignore
        const res = await directus.request(updateItem('crm_tasks', id, {
            completed,
            title
        }));

        return NextResponse.json(res);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'No ID' }, { status: 400 });

        // @ts-ignore
        await directus.request(deleteItem('crm_tasks', id));

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
