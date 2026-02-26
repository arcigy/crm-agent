import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import directus from './directus';
import { updateItem } from '@directus/sdk';
import { AI_MODELS } from './ai-providers';

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function generateAndSaveChatTitle(
  conversationId: string,
  firstUserMessage: string,
  firstAgentResponse: string
): Promise<void> {

  const systemPrompt = `
Generate a short, descriptive title for this conversation (max 5 words) for user message: "{{FIRST_MESSAGE}}" and agent response: "{{FIRST_RESPONSE}}".
Respond ONLY with the title.
`
  .replace('{{FIRST_MESSAGE}}', firstUserMessage.slice(0, 500))
  .replace('{{FIRST_RESPONSE}}', firstAgentResponse.slice(0, 500));

  try {
    const response = await generateText({
      model: google(AI_MODELS.ROUTER),
      system: systemPrompt,
      prompt: "Generuj názov pre túto konverzáciu.",
      temperature: 0.2,
    });

    const title = response.text || "";

    const cleanTitle = title
      .trim()
      .replace(/^[\s"']+|[\s"']+$|[.!?]$/g, '') // Odstrániť úvodzovky, whitespace a bodky
      .slice(0, 50);

    await directus.request(updateItem('conversations', conversationId, {
      title: cleanTitle,
    }));
  } catch (error) {
    console.error('[TITLE GEN] Failed:', error);
  }
}
