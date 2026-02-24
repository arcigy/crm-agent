import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import directus from '@/lib/directus';
import { readItems } from '@directus/sdk';
import { ChatInterface } from '@/components/chat/ChatInterface';

export default async function NewChatPage() {
  const user = await currentUser();
  if (!user) redirect('/'); // Sign In fallback

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
    <div className="flex h-screen bg-gray-950">
      <ChatInterface
        conversations={(conversationsResult as any) ?? []}
        chatCount={conversationsResult?.length ?? 0}
        maxChats={20}
      />
    </div>
  );
}
