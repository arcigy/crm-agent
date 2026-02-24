import { currentUser } from '@clerk/nextjs/server';
import directus from '@/lib/directus';
import { readItems, createItem } from '@directus/sdk';

const MAX_CHATS_PER_USER = 20;

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // 1. Skontroluj limit
    const existing = await directus.request(readItems('conversations', {
      filter: {
        user_id: { _eq: user.id },
        deleted_at: { _null: true },
      },
      aggregate: { count: ['id'] },
    }));

    const count = Number((existing[0]?.count as any)?.id ?? 0);

    if (count >= MAX_CHATS_PER_USER) {
      return Response.json({
        error: 'CHAT_LIMIT_REACHED',
        message: `Dosiahol si limit ${MAX_CHATS_PER_USER} konverzácií. Vymaž staré aby si mohol začať novú.`,
        currentCount: count,
      }, { status: 429 });
    }

    // 2. Vytvor konverzáciu s dočasným názvom
    const conversation = await directus.request(createItem('conversations', {
      user_id: user.id,
      title: 'Nová konverzácia',
      message_count: 0,
    }));

    return Response.json({ conversation });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const conversations = await directus.request(readItems('conversations', {
      filter: {
        user_id: { _eq: user.id },
        deleted_at: { _null: true },
      },
      sort: ['-updated_at'],
      limit: MAX_CHATS_PER_USER,
      fields: ['id', 'title', 'created_at', 'updated_at', 'message_count'],
    }));

    return Response.json({ conversations });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
