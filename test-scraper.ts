import { scrapePage } from './src/lib/scraper/web-scraper';

async function test() {
  const url = 'https://www.eset.com/sk';
  console.log(`Starting scrape test for ${url} ...`);
  const start = Date.now();
  
  try {
    const result = await scrapePage(url);
    console.log(`\n=== RESULT ===`);
    console.log(`Title: ${result.title}`);
    console.log(`Words: ${result.wordCount}`);
    console.log(`Rendered with Browser: ${result.renderedWithBrowser}`);
    console.log(`Time: ${Date.now() - start}ms`);
    console.log(`Markdown Preview:`);
    console.log(result.markdown.substring(0, 500) + '...\n');
  } catch (err: any) {
    console.error(`ERROR: ${err.message}`);
  }
}

test();
