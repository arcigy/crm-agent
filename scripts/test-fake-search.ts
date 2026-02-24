import * as dotenv from 'dotenv';
dotenv.config();
import { webSearch } from '../src/lib/scraper/search';

async function testSearch() {
  const q = 'Creative Studio 472 produkty 2026';
  const res = await webSearch(q);
  console.log(res);
}
testSearch();
