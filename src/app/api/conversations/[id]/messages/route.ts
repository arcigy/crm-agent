import { currentUser } from '@clerk/nextjs/server';
import directus from '@/lib/directus';
import { readItem, readItems } from '@directus/sdk';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await currentUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Verify ownership
    const conversation = await directus.request(readItem('conversations', params.id, {
      fields: ['id', 'user_id', 'title'],
    }));

    if (!conversation || conversation.user_id !== user.id) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const messages = await directus.request(readItems('messages', {
      filter: { conversation_id: { _eq: params.id } },
      sort: ['created_at'],
      limit: 100,   // Max 100 správ na chat pre context window
      fields: ['id', 'role', 'content', 'created_at'],
    }));

    return Response.json({ messages, conversation });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
