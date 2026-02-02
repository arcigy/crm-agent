import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import directus from '@/lib/directus';
import { createItem, readItems, updateItem, deleteItem, readItem } from '@directus/sdk';

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

        const { title, contact_id, project_id, due_date } = await req.json();

        // @ts-ignore
        const res = await directus.request(createItem('crm_tasks', {
            title,
            completed: false,
            user_email: userEmail,
            contact_id: contact_id || null,
            project_id: project_id || null,
            due_date: due_date || null
        }));

        return NextResponse.json(res);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const user = await currentUser();
        const userEmail = user?.emailAddresses[0]?.emailAddress;
        if (!userEmail) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id, completed, title, contact_id, project_id, due_date } = await req.json();

        // Ownership check
        const current = (await directus.request(readItem('crm_tasks', id))) as any;
        if (current.user_email !== userEmail) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // @ts-ignore
        const res = await directus.request(updateItem('crm_tasks', id, {
            completed,
            title,
            contact_id: contact_id === undefined ? undefined : contact_id,
            project_id: project_id === undefined ? undefined : project_id,
            due_date: due_date === undefined ? undefined : due_date
        }));

        return NextResponse.json(res);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const user = await currentUser();
        const userEmail = user?.emailAddresses[0]?.emailAddress;
        if (!userEmail) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'No ID' }, { status: 400 });

        // Ownership check
        const current = (await directus.request(readItem('crm_tasks', id))) as any;
        if (current.user_email !== userEmail) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // @ts-ignore
        await directus.request(deleteItem('crm_tasks', id));

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
