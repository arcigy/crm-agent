import directus from '../src/lib/directus';
import { readItems } from '@directus/sdk';

async function run() {
  try {
    const contacts = await directus.request(readItems('contacts', {
      filter: { first_name: { _icontains: 'Martin' } }
    }));
    console.log('MARTINS_FOUND:', JSON.stringify(contacts, null, 2));
  } catch (err) {
    console.error(err);
  }
}
run();
