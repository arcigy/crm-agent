import robotsParser from 'robots-parser';

const robotsCache = new Map<string, { rules: ReturnType<typeof robotsParser>; expires: number }>();
const CACHE_TTL = 3600 * 1000; // 1 hodina

export async function canCrawl(url: string): Promise<boolean> {
  try {
    const parsed = new URL(url);
    const robotsUrl = `${parsed.protocol}//${parsed.host}/robots.txt`;
    const cacheKey = parsed.host;

    // Cache robots.txt — nefetchovať pri každej URL
    const cached = robotsCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return cached.rules.isAllowed(url, 'Googlebot') ?? true;
    }

    const response = await fetch(robotsUrl, { 
      signal: AbortSignal.timeout(5000) 
    });
    
    if (!response.ok) return true; // Ak robots.txt neexistuje → crawl povolený

    const text = await response.text();
    const rules = robotsParser(robotsUrl, text);

    robotsCache.set(cacheKey, {
      rules,
      expires: Date.now() + CACHE_TTL,
    });

    return rules.isAllowed(url, 'Googlebot') ?? true;

  } catch {
    return true; // Pri chybe → optimisticky povol
  }
}

export async function getCrawlDelay(host: string): Promise<number> {
  const cached = robotsCache.get(host);
  if (!cached) return 1000; // Default: 1 sekunda medzi requestmi
  return (cached.rules.getCrawlDelay('Googlebot') ?? 1) * 1000;
}
