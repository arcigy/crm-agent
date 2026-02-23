import { URL } from 'url';
import { JSDOM } from 'jsdom';
import PQueue from 'p-queue';
import { canCrawl, getCrawlDelay } from './robots';
import { scrapePage } from './web-scraper';

export interface CrawlOptions {
  maxPages?: number;        // Default: 20
  maxDepth?: number;        // Default: 2
  sameDomainOnly?: boolean; // Default: true
  includePatterns?: RegExp[]; // URL patterns to include
  excludePatterns?: RegExp[]; // URL patterns to skip
}

export interface CrawlResult {
  url: string;
  title: string;
  markdown: string;
  depth: number;
}

function extractLinks(html: string, baseUrl: string): string[] {
  const dom = new JSDOM(html);
  const links: string[] = [];
  const base = new URL(baseUrl);

  dom.window.document.querySelectorAll('a[href]').forEach(anchor => {
    try {
      const href = anchor.getAttribute('href')!;
      const absolute = new URL(href, base).href;

      // Filtrovanie: len HTTP/HTTPS, nie fragment linky
      if (absolute.startsWith('http') && !absolute.includes('#')) {
        links.push(absolute);
      }
    } catch {
      // Nevalidná URL — preskočiť
    }
  });

  return [...new Set(links)]; // Deduplikácia
}

const activeCrawls = new Map<string, Promise<CrawlResult[]>>();

export async function crawlSite(
  startUrl: string,
  options: CrawlOptions = {}
): Promise<CrawlResult[]> {
  const host = new URL(startUrl).hostname;
  
  // Ak už crawlujeme tento host, vráť existujúci promise
  if (activeCrawls.has(host)) {
    return activeCrawls.get(host)!;
  }
  
  const crawlPromise = _crawlSite(startUrl, options)
    .finally(() => activeCrawls.delete(host));
  
  activeCrawls.set(host, crawlPromise);
  return crawlPromise;
}

async function _crawlSite(
  startUrl: string,
  options: CrawlOptions = {}
): Promise<CrawlResult[]> {
  const {
    maxPages = 20,
    maxDepth = 2,
    sameDomainOnly = true,
    excludePatterns = [/\.(pdf|zip|doc|docx|xls|xlsx|png|jpg|jpeg|gif|mp4|mp3)$/i],
  } = options;

  const baseHost = new URL(startUrl).hostname;
  const visited = new Set<string>();
  const results: CrawlResult[] = [];
  const queue = new PQueue({ concurrency: 2 }); // Max 2 paralelné requesty

  async function crawlUrl(url: string, depth: number): Promise<void> {
    if (visited.has(url)) return;
    if (visited.size >= maxPages) return;
    if (depth > maxDepth) return;

    // Robots.txt check
    const allowed = await canCrawl(url);
    if (!allowed) {
      console.log(`[CRAWLER] Blocked by robots.txt: ${url}`);
      return;
    }

    // Domain check
    if (sameDomainOnly && new URL(url).hostname !== baseHost) return;

    // Pattern exclusion
    if (excludePatterns.some(p => p.test(url))) return;

    visited.add(url);

    // Rate limiting — rešpektuj crawl delay
    const delay = await getCrawlDelay(new URL(url).hostname);
    await new Promise(r => setTimeout(r, delay));

    try {
      const scraped = await scrapePage(url);
      results.push({ url, title: scraped.title, markdown: scraped.markdown, depth });

      // Extrahovať a zaradiť ďalšie linky do queue
      if (depth < maxDepth) {
        const links = extractLinks(scraped.rawHtml ?? '', url);
        for (const link of links.slice(0, 10)) { // Max 10 linkov na stránku
          queue.add(() => crawlUrl(link, depth + 1));
        }
      }

    } catch (error) {
      console.error(`[CRAWLER] Failed: ${url}`, error);
    }
  }

  queue.add(() => crawlUrl(startUrl, 0));
  await queue.onIdle();

  return results;
}
