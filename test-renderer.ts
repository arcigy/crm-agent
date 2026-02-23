import { scrapePage } from './src/lib/scraper/web-scraper';
import { renderWithBrowser } from './src/lib/scraper/js-renderer';

async function test() {
  const url = 'https://www.apple.com';
  console.log(`Starting scrape test for ${url} ...`);
  const start = Date.now();
  
  try {
    const html = await renderWithBrowser(url);
    console.log(`Rendered HTML length: ${html.length}`);
    console.log(`Time: ${Date.now() - start}ms`);
    console.log(`Success! Browser launch promise resolves correctly.`);
  } catch (err: any) {
    console.error(`ERROR: ${err.message}`);
  }
}

test();
