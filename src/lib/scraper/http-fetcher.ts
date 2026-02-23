import got, { Got } from 'got';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
];

function randomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export const httpClient: Got = got.extend({
  timeout: { request: 15000 },
  retry: {
    limit: 3,
    statusCodes: [429, 500, 502, 503, 504],
    backoffLimit: 10000,
  },
  headers: {
    'User-Agent': randomUserAgent(),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'sk-SK,sk;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
  },
  followRedirect: true,
  maxRedirects: 5,
});

export interface FetchResult {
  html: string;
  url: string;           // Final URL after redirects
  statusCode: number;
  contentType: string;
  isJavaScriptRequired: boolean;
}

export async function fetchPage(url: string): Promise<FetchResult> {
  const response = await httpClient.get(url);

  const html = response.body;
  const contentType = response.headers['content-type'] ?? '';

  // Detekcia stránok ktoré potrebujú JS:
  // 1. React/Vue/Angular SPA indikátory
  // 2. Prázdny body alebo tiny body (< 500 chars)
  // 3. Explicitné JS-only markers
  const isJSRequired =
    html.includes('__NEXT_DATA__') ||
    html.includes('ng-version') ||
    html.includes('data-reactroot') ||
    html.includes('id="__nuxt"') ||
    (html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1]?.trim().length ?? 0) < 500;

  return {
    html,
    url: response.url,
    statusCode: response.statusCode,
    contentType,
    isJavaScriptRequired: isJSRequired,
  };
}
