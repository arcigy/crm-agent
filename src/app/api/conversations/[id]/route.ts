import { currentUser } from '@clerk/nextjs/server';
import directus from '@/lib/directus';
import { readItem, updateItem } from '@directus/sdk';

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await currentUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Overenie vlastníctva — user nemôže mazať cudzie chaty
    const conversation = await directus.request(readItem('conversations', params.id, {
      fields: ['id', 'user_id'],
    }));

    if (!conversation || conversation.user_id !== user.id) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    // Soft delete
    await directus.request(updateItem('conversations', params.id, {
      deleted_at: new Date().toISOString(),
    }));

    return Response.json({ success: true });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
