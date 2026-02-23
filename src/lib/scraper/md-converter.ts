import TurndownService from 'turndown';
// @ts-ignore
import { gfm } from 'turndown-plugin-gfm';

const turndown = new TurndownService({
  headingStyle: 'atx',          // # Heading štýl
  codeBlockStyle: 'fenced',     // ```code``` štýl
  bulletListMarker: '-',
  strongDelimiter: '**',
  emDelimiter: '_',
});

// GitHub Flavored Markdown — tables, strikethrough
turndown.use(gfm);

// Odstrániť zbytočné HTML elementy
turndown.remove(['script', 'style', 'noscript', 'iframe', 'form', 'input', 'button']);

// Custom pravidlo pre obrázky — zachovaj alt text, zruš src
turndown.addRule('images', {
  filter: 'img',
  replacement: (content, node) => {
    const alt = (node as HTMLElement).getAttribute('alt') ?? '';
    return alt ? `[Obrázok: ${alt}]` : '';
  },
});

// Custom pravidlo pre linky — zachovaj text, zachovaj URL
turndown.addRule('links', {
  filter: 'a',
  replacement: (content, node) => {
    const href = (node as HTMLElement).getAttribute('href');
    if (!href || !content.trim()) return content;
    if (href.startsWith('mailto:') || href.startsWith('javascript:')) return content;
    return `[${content}](${href})`;
  },
});

export function htmlToMarkdown(html: string): string {
  const markdown = turndown.turndown(html);

  // Post-processing: upratanie výstupu
  return markdown
    .replace(/\n{3,}/g, '\n\n')          // Max 2 prázdne riadky za sebou
    .replace(/^\s+|\s+$/g, '')            // Trim
    .replace(/\[]\([^)]*\)/g, '')         // Odstrániť prázdne linky []()
    .trim();
}
