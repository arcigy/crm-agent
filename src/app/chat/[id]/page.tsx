import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import directus from '@/lib/directus';
import { readItem, readItems } from '@directus/sdk';
import { ChatInterface } from '@/components/chat/ChatInterface';

import { ContactPreviewProvider } from '@/components/providers/ContactPreviewProvider';
import { ProjectPreviewProvider } from '@/components/providers/ProjectPreviewProvider';

export default async function ChatPage({ params }: { params: { id: string } }) {
  const user = await currentUser();
  if (!user) redirect('/');

  // Load conversation + verify ownership
  try {
    const conversation = await directus.request(readItem('conversations', params.id, {
      fields: ['id', 'title', 'user_id', 'deleted_at'],
    }));

    if (!conversation || conversation.user_id !== user.id || conversation.deleted_at) {
      redirect('/chat');
    }
  } catch(e) {
      redirect('/chat');
  }

  let messagesResult: any = [];
  try {
    messagesResult = await directus.request(readItems('messages', {
      filter: { conversation_id: { _eq: params.id } },
      sort: ['id'],
      limit: 100,
      fields: ['id', 'role', 'content', 'created_at'],
    }));
  } catch (error) {
    console.error("Failed to load messages:", error);
  }

  let conversationsResult: any = [];
  try {
    conversationsResult = await directus.request(readItems('conversations', {
      filter: { user_id: { _eq: user.id }, deleted_at: { _null: true } },
      sort: ['-updated_at'],
      limit: 20,
      fields: ['id', 'title', 'updated_at', 'message_count'],
    }));
  } catch (error) {
    console.error("Failed to load conversations:", error);
  }

  return (
    <ChatInterface
      conversationId={params.id}
      initialMessages={(messagesResult as any) ?? []}
      conversations={(conversationsResult as any) ?? []}
      chatCount={conversationsResult?.length ?? 0}
      maxChats={20}
    />
  );
}
