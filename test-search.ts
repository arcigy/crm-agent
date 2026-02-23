import * as dotenv from 'dotenv';
dotenv.config(); // nacitanie .env lokalne

import { webSearch } from './src/lib/scraper/search';

async function testSearch() {
  console.log('Testing Serper API Search...');
  console.log('KEY:', process.env.SERPER_API_KEY ? 'Set' : 'Missing');
  try {
    const results = await webSearch('Najlepsie CRM pre male firmy na slovensku', 3);
    console.log(`Found ${results.length} results:`);
    results.forEach((r, i) => {
      console.log(`\n[${i + 1}] ${r.title}`);
      console.log(`URL: ${r.url}`);
      console.log(`Desc: ${r.description}`);
    });
  } catch (error) {
    console.error('Test Failed:', error);
  }
}

testSearch();
