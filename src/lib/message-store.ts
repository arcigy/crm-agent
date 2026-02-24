import directus from './directus';
import { readItems, createItem, updateItem } from '@directus/sdk';

export async function saveUserMessage(
  conversationId: string,
  userMessage: string
): Promise<void> {
  await directus.request(createItem('messages', {
    conversation_id: conversationId,
    role: 'user',
    content: userMessage,
    created_at: new Date().toISOString()
  }));

  const conv = await directus.request(readItems('conversations', {
    filter: { id: { _eq: conversationId } },
    fields: ['message_count']
  }));
  const count = conv[0]?.message_count || 0;

  await directus.request(updateItem('conversations', conversationId, {
    updated_at: new Date().toISOString(),
    message_count: count + 1,
  }));
}

export async function saveAssistantMessage(
  conversationId: string,
  assistantResponse: string
): Promise<void> {
  await directus.request(createItem('messages', {
    conversation_id: conversationId,
    role: 'assistant',
    content: assistantResponse,
    created_at: new Date().toISOString()
  }));

  const conv = await directus.request(readItems('conversations', {
    filter: { id: { _eq: conversationId } },
    fields: ['message_count']
  }));
  const count = conv[0]?.message_count || 0;

  await directus.request(updateItem('conversations', conversationId, {
    updated_at: new Date().toISOString(),
    message_count: count + 1,
  }));
}

// Načítať históriu pre agent context window
export async function loadChatHistory(
  conversationId: string,
  limit = 20  // Posledných 20 správ pre kontext agenta
): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
  const result = await directus.request(readItems('messages', {
    filter: { conversation_id: { _eq: conversationId } },
    sort: ['-id'],  // Zoradiť od najnovšej (ID je garantovane rastúce)
    limit,
    fields: ['role', 'content'],
  }));

  // Obrátiť späť na chronologické poradie pre LLM
  return (result ?? []).reverse() as Array<{ role: 'user' | 'assistant'; content: string }>;
}
