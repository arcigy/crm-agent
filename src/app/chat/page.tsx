import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import directus from '@/lib/directus';
import { readItems } from '@directus/sdk';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { shouldBypassAuth, getDevUser } from '@/lib/dev-mode/auth-bypass';

import { ContactPreviewProvider } from '@/components/providers/ContactPreviewProvider';
import { ProjectPreviewProvider } from '@/components/providers/ProjectPreviewProvider';

export default async function NewChatPage() {
  const isBypass = shouldBypassAuth();
  const user = await currentUser();
  
  // Only redirect if NOT in bypass mode AND user is missing
  if (!user && !isBypass) redirect('/'); 

  // Use clerk user ID or fallback to dev user ID for Directus query
  const userId = user?.id || (isBypass ? getDevUser().id : null);

  let conversationsResult: any = [];
  if (userId) {
    try {
      conversationsResult = await directus.request(readItems('conversations', {
        filter: { user_id: { _eq: userId }, deleted_at: { _null: true } },
        sort: ['-updated_at'],
        limit: 20,
        fields: ['id', 'title', 'updated_at', 'message_count'],
      }));
    } catch (error) {
      console.error("Failed to load conversations:", error);
    }
  }

  return (
    <ChatInterface
      conversations={(conversationsResult as any) ?? []}
      chatCount={conversationsResult?.length ?? 0}
      maxChats={20}
    />
  );
}
