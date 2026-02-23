import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export interface CleanedContent {
  title: string;
  content: string;        // Čistý HTML — iba hlavný content
  textContent: string;    // Plain text
  excerpt: string;
  byline?: string;        // Autor ak existuje
  siteName?: string;
}

// Elementy ktoré VŽDY chceme odstrániť pred Readability
const BOILERPLATE_SELECTORS = [
  'nav', 'header', 'footer', 'aside',
  '[class*="cookie"]', '[class*="popup"]', '[class*="modal"]',
  '[class*="banner"]', '[class*="advertisement"]', '[class*="ad-"]',
  '[id*="cookie"]', '[id*="popup"]', '[id*="banner"]',
  'script', 'style', 'noscript',
  '.sidebar', '.widget', '.newsletter',
];

export function cleanHtml(html: string, url: string): CleanedContent {
  const dom = new JSDOM(html, { url });
  const document = dom.window.document;

  // Odstrániť boilerplate pred Readability
  for (const selector of BOILERPLATE_SELECTORS) {
    document.querySelectorAll(selector).forEach(el => el.remove());
  }

  // Readability extrahuje hlavný content
  const reader = new Readability(document, {
    charThreshold: 20,      // Minimálny počet znakov pre extrakciu
    keepClasses: false,     // Nechceme CSS classy v outpute
    nbTopCandidates: 5,
  });

  const article = reader.parse();

  if (!article) {
    // Fallback: ak Readability zlyhal, vráť celý čistý text
    return {
      title: document.title || url,
      content: document.body?.innerHTML ?? '',
      textContent: document.body?.textContent ?? '',
      excerpt: '',
    };
  }

  return {
    title: article.title || url,
    content: article.content ?? '',
    textContent: article.textContent ?? '',
    excerpt: article.excerpt ?? '',
    byline: article.byline ?? undefined,
    siteName: article.siteName ?? undefined,
  };
}
