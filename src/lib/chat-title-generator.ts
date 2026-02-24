import { callModel } from './ai-providers';
import directus from './directus';
import { updateItem } from '@directus/sdk';

export async function generateAndSaveChatTitle(
  conversationId: string,
  firstUserMessage: string,
  firstAgentResponse: string
): Promise<void> {

  const prompt = `
Na základe tejto konverzácie vygeneruj krátky, výstižný názov v slovenčine.

Správa užívateľa: "${firstUserMessage.slice(0, 300)}"
Odpoveď asistenta: "${firstAgentResponse.slice(0, 200)}"

Pravidlá:
1. Maximálne 6 slov
2. Bez úvodzoviek, bodiek, otáznikov na konci
3. Slovenčina, prirodzený jazyk
4. Zachyť hlavnú tému (nie "Nová konverzácia")

Príklady dobrých názvov:
- "Vytvorenie projektu pre Google"
- "Analýza pipeline dealov"  
- "Merge duplicitných kontaktov"
- "Ranný briefing pre Petra"

Odpovedz LEN názvom, nič iné:
`;

  try {
    const title = await callModel(prompt, {
      temperature: 0.3,
      maxTokens: 30,
    });

    const cleanTitle = title
      .trim()
      .replace(/^["']|["']$/g, '')  // Odstrániť úvodzovky
      .replace(/[.!?]$/, '')        // Odstrániť interpunkciu na konci
      .slice(0, 60);                // Hard limit

    await directus.request(updateItem('conversations', conversationId, {
      title: cleanTitle,
    }));
  } catch (error) {
    console.error('[TITLE GEN] Failed:', error);
  }
}
