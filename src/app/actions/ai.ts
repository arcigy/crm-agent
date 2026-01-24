import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function classifyEmail(content: string) {
    const prompt = `
Si profesionálny CRM asistent. Tvojou úlohou je analyzovať obsah e-mailu.

DÔLEŽITÉ: Akonáhle zistíš, že ide o SPAM, NEWSLETTER, REKLAMU alebo nerelevantnú hromadnú správu:
1. Nastav "intent" na "spam".
2. Ostatné polia (service_category, estimated_budget, next_step, deadline) nastav na "—".
3. Nastav "priority" na "nizka".
4. Do "summary" napíš len "Filter: Spam/Newsletter".
5. Ukonči analýzu.

Ak ide o RELEVANTNÚ správu, vyplň:
1. "intent": Jeden z (dopyt, otazka, problem, faktura, ine)
2. "priority": Jeden z (vysoka, stredna, nizka)
3. "sentiment": Jeden z (pozitivny, neutralny, negativny)
4. "service_category": Stručný názov služby.
5. "estimated_budget": Suma alebo "Neznámy".
6. "next_step": Krátka inštrukcia (max 10 slov).
7. "deadline": Termín alebo null.
8. "summary": Detailný sumár (2-3 vety). Vypichni najdôležitejšie informácie, kontext správy a kľúčové požiadavky (napr. navrhované termíny, špecifiká zadania, dôležité mená).

E-MAIL:
"""
${content}
"""

Vráť čistý JSON. Odpovedaj v slovenčine.
`;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "Si expert na analýzu obchodnej komunikácie. Odpovedáš striktne v JSON formáte." },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0,
        });

        const result = JSON.parse(response.choices[0].message.content || '{}');
        return result;
    } catch (error) {
        console.error('AI Classification Error:', error);
        return null;
    }
}
