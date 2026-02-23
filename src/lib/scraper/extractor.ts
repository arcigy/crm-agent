import { callModel } from '../ai-providers';

export interface ExtractionSchema {
  [fieldName: string]: {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    description: string;
    required?: boolean;
  };
}

function truncateToTokenBudget(text: string, maxTokens: number): string {
  // Aproximácia: ~3 znaky per token pre slovenčinu/markdown
  const approxChars = maxTokens * 3;
  if (text.length <= approxChars) return text;
  
  // Nekrájaj uprostred vety
  const truncated = text.slice(0, approxChars);
  const lastPeriod = truncated.lastIndexOf('.');
  return lastPeriod > approxChars * 0.8 
    ? truncated.slice(0, lastPeriod + 1) 
    : truncated;
}

export async function extractStructuredData<T = Record<string, unknown>>(
  markdown: string,
  schema: ExtractionSchema,
  url: string
): Promise<T> {

  const schemaDescription = Object.entries(schema)
    .map(([key, def]) => `- ${key} (${def.type}${def.required ? ', REQUIRED' : ''}): ${def.description}`)
    .join('\n');

  const truncatedContent = truncateToTokenBudget(markdown, 6000);

  const prompt = `
Extract structured data from this webpage content.
Source URL: ${url}

SCHEMA TO EXTRACT:
${schemaDescription}

WEBPAGE CONTENT:
${truncatedContent} ${markdown.length > truncatedContent.length ? '\n\n[Content truncated...]' : ''}

Rules:
1. Extract ONLY data that is explicitly present in the content
2. If a field is not found, use null (never hallucinate values)
3. For arrays, extract all instances found
4. Return ONLY valid JSON matching the schema, no explanation

Respond with JSON only:
`;

  const result = await callModel(prompt, { temperature: 0, maxTokens: 2000 });

  // Parse s fallbackom
  try {
    return JSON.parse(result) as T;
  } catch {
    // Regex rescue pre JSON
    const match = result.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as T;
    throw new Error(`Extraction failed: could not parse LLM response as JSON`);
  }
}
