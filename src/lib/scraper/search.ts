// ODPORÚČANIE: Serper.dev API (2500 requests free)

export interface SearchResult {
  title: string;
  url: string;
  description: string;
}

export async function webSearch(query: string, maxResults: number = 5): Promise<SearchResult[]> {
  const SERPER_API_KEY = process.env.SERPER_API_KEY;

  if (!SERPER_API_KEY) {
    throw new Error('SERPER_API_KEY not configured');
  }

  const response = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': SERPER_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q: query,
      num: maxResults,
    }),
  });

  if (!response.ok) {
    throw new Error(`Serper API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  return (data.organic ?? []).map((r: any) => ({
    title: r.title,
    url: r.link,
    description: r.snippet,
  }));
}
