import { NextResponse } from 'next/server';
import directus from '@/lib/directus';
import { createItem, readItems } from '@directus/sdk';
import { getUserEmail } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const userEmail = await getUserEmail();
    if (!userEmail) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    if (q.length < 2) return NextResponse.json({ contacts: [] });

    // @ts-ignore
    const results = await directus.request(readItems('contacts', {
      filter: {
        _or: [
          { email: { _icontains: q } },
          { first_name: { _icontains: q } },
          { last_name: { _icontains: q } },
        ],
        deleted_at: { _null: true }
      },
      fields: ['id', 'first_name', 'last_name', 'email'],
      limit: 8,
      sort: ['first_name']
    }));

    return NextResponse.json({ contacts: results });
  } catch (error: any) {
    return NextResponse.json({ contacts: [] });
  }
}



export async function POST(req: Request) {
    try {
        const userEmail = await getUserEmail();
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
