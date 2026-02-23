import { fetchPage } from './http-fetcher';
import { renderWithBrowser } from './js-renderer';
import { cleanHtml } from './html-cleaner';
import { htmlToMarkdown } from './md-converter';

export interface ScrapeResult {
  url: string;
  title: string;
  markdown: string;
  excerpt: string;
  rawHtml?: string;       // Interné použitie pre crawling
  renderedWithBrowser: boolean;
  wordCount: number;
  scrapedAt: string;
}

export async function scrapePage(url: string, timeoutMs: number = 45000): Promise<ScrapeResult> {
  return Promise.race([
    _scrapePage(url),
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(`Scraping timeout after ${timeoutMs}ms for ${url}`)), timeoutMs)
    ),
  ]);
}

async function _scrapePage(url: string): Promise<ScrapeResult> {
  // Krok 1: Skús statický fetch
  let html: string;
  let renderedWithBrowser = false;

  const fetchResult = await fetchPage(url);

  if (fetchResult.isJavaScriptRequired) {
    // Krok 2: JS rendering potrebný
    console.log(`[SCRAPER] JS rendering required: ${url}`);
    html = await renderWithBrowser(url);
    renderedWithBrowser = true;
  } else {
    html = fetchResult.html;
  }

  // Krok 3: Čistenie a extrakcia
  const cleaned = cleanHtml(html, url);

  // Krok 4: Konverzia do Markdown
  const markdown = htmlToMarkdown(cleaned.content);

  // Quality check — ak je výsledok príliš krátky, skús browser
  if (!renderedWithBrowser && markdown.length < 200) {
    console.log(`[SCRAPER] Content too short (${markdown.length} chars), retrying with browser`);
    const browserHtml = await renderWithBrowser(url);
    const browserCleaned = cleanHtml(browserHtml, url);
    const browserMarkdown = htmlToMarkdown(browserCleaned.content);

    if (browserMarkdown.length > markdown.length) {
      return {
        url,
        title: browserCleaned.title,
        markdown: browserMarkdown,
        excerpt: browserCleaned.excerpt,
        rawHtml: browserHtml,
        renderedWithBrowser: true,
        wordCount: browserMarkdown.split(/\s+/).length,
        scrapedAt: new Date().toISOString(),
      };
    }
  }

  return {
    url,
    title: cleaned.title,
    markdown,
    excerpt: cleaned.excerpt,
    rawHtml: html,
    renderedWithBrowser,
    wordCount: markdown.split(/\s+/).length,
    scrapedAt: new Date().toISOString(),
  };
}
