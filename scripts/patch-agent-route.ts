import * as fs from 'fs';
import * as path from 'path';

const routePath = path.join(process.cwd(), 'src/app/api/ai/agent/route.ts');
let content = fs.readFileSync(routePath, 'utf8');

if (!content.includes('message-store')) {
  // Add imports
  content = content.replace(
    "import { extractAndStoreIds } from '@/app/actions/agent-self-corrector';",
    `import { extractAndStoreIds } from '@/app/actions/agent-self-corrector';
import { saveMessagePair, loadChatHistory } from '@/lib/message-store';
import { generateAndSaveChatTitle } from '@/lib/chat-title-generator';
import directus from '@/lib/directus';
import { readItems, createItem } from '@directus/sdk';`
  );

  // Update POST args
  content = content.replace(
    "const { messages, debug = false } = await req.json();",
    `const { message, conversationId, debug = false, messages: reqMessages } = await req.json();`
  );

  // Update logic before log(ROUTER...)
  const oldSetup = `    const lastUserMsg = messages[messages.length - 1].content;`;
  const newSetup = `
    let activeConversationId = conversationId;
    let history: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    // Použijeme buď prenesené messagy alebo si ich stiahneme, ak máme conversationId
    if (activeConversationId) {
        history = await loadChatHistory(activeConversationId);
    } else {
        // Skontroluj limit a vytvor novu konverzaciu
        try {
            const existing = await directus.request(readItems('conversations', {
                filter: { user_id: { _eq: user.id }, deleted_at: { _null: true } },
                aggregate: { count: ['id'] },
            }));
            const count = Number((existing[0]?.count as any)?.id ?? 0);
            if (count >= 20) {
                 return Response.json({ error: 'CHAT_LIMIT_REACHED', message: 'Dosiahol si limit 20 konverzácií.' }, { status: 429 });
            }
            const newConv = await directus.request(createItem('conversations', {
                user_id: user.id,
                title: 'Nová konverzácia',
                message_count: 0,
            }));
            activeConversationId = newConv.id;
        } catch (e) {
            console.error("Failed to create conversation:", e);
        }
    }

    const isFirstMessage = history.length === 0;
    const lastUserMsg = message || (reqMessages ? reqMessages[reqMessages.length - 1].content : '');
    const messages = [...history, { role: 'user', content: lastUserMsg }];

    let fullAgentResponse = ''; // Bude akumulovať odpoveď pre zápis do histórie
`;
  content = content.replace(oldSetup, newSetup);

  // streamText pre CONVERSATION:
  content = content.replace(
    `for await (const delta of result.textStream) await writer.write(encoder.encode(delta));`,
    `for await (const delta of result.textStream) {
        fullAgentResponse += delta;
        await writer.write(encoder.encode(delta));
    }`
  );

  // pred return pre CONVERSATION a router fallback:
  content = content.replace(
    `await writer.write(encoder.encode(clarification));
                return;`,
    `fullAgentResponse = clarification;
                await writer.write(encoder.encode(clarification));
                return;`
  );

  // streamText pre FINAL REPORT
  content = content.replace(
    `for await (const delta of reportResult.textStream) await writer.write(encoder.encode(delta));`,
    `for await (const delta of reportResult.textStream) {
        fullAgentResponse += delta;
        await writer.write(encoder.encode(delta));
    }`
  );

  // DO finally bloku: ulozenie do DB + header ID (vlastne vratime ID nejako? Next.js stream nedovoluje meniť headers po spusteni streamu ... ale app chce return `conversationId` v response json podla navodu, ale stream to nepustí v bodoch, len ak by sme poslali \`[DONE] ID: xxx\`. Frontend si ho obvykle ulozi inak. Mozeme poslat do logu aktivne ID). Pre streamText mozme napisat do headers alebo na zaciatok streamu, popripade vyuzit headers.
  // Podla navodu The user want us to return Response.json({ response, conversationId }). But original code returns `new Response(readable)`. Let's stick to streaming + custom header \`x-conversation-id\`.

  content = content.replace(
    `} finally {
            await writer.close();
        }`,
    `} finally {
            if (activeConversationId && fullAgentResponse) {
                try {
                    await saveMessagePair(activeConversationId, lastUserMsg, fullAgentResponse);
                    if (isFirstMessage) {
                        generateAndSaveChatTitle(activeConversationId, lastUserMsg, fullAgentResponse).catch(console.error);
                    }
                } catch(e) {
                    console.error("Failed to save message pair", e);
                }
            }
            await writer.close();
        }`
  );

  const headerRegex = /return new Response\(readable, { headers: { 'Content-Type': 'text\/plain; charset=utf-8' } }\);/;
  if (headerRegex.test(content)) {
     content = content.replace(
         headerRegex,
         `return new Response(readable, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Conversation-Id': activeConversationId || '' } });`
     );
  }

  fs.writeFileSync(routePath, content, 'utf8');
}
