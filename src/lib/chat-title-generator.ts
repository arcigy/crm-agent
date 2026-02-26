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
Na základe tejto konverzácie vygeneruj krátky názov v slovenčine.

Pravidlá:
- Maximálne 5 slov
- Bez úvodzoviek, bodiek na konci
- Zachyť hlavnú tému (nie "Nová konverzácia")
- Slovenčina, prirodzený jazyk

Príklady: "Projekt Rebranding pre Bezáka", "Pipeline prehľad Q1", "Email Petrovi o meškaní"

Odpovedz LEN názvom, nič iné.
`;

  try {
    const response = await generateText({
      model: google(AI_MODELS.ROUTER),
      system: systemPrompt,
      prompt: `Užívateľ: ${firstUserMessage.slice(0, 150)}\nAgent: ${firstAgentResponse.slice(0, 150)}`,
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
