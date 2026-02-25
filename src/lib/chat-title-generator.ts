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
Si expert na zhrnutie textu do jedného veľmi krátkeho (max 5 slov) zmysluplného názvu.
Tvojim jediným cieľom je prečítať prompt používateľa a odpoveď agenta a vrátiť výstižný názov.

PRAVIDLÁ:
- Názov musí mať MAXIMÁLNE 5 slov.
- NEPOUŽÍVAJ úvodzovky, bodky, výkričníky, ani predpony typu "Názov: ".
- Píš čisto v slovenskom jazyku.
- Iba zmysluplný text. Ak užívateľ napísal "ahoj", odpovedz napríklad "Zoznámenie" alebo "Pozdrav".
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
