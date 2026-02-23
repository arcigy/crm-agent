import directus from '../src/lib/directus';
import { readItems } from '@directus/sdk';

async function run() {
  try {
    const contacts = await directus.request(readItems('contacts', {
      filter: { status: { _eq: 'new' } },
      limit: -1
    }));
    console.log('NEW_CONTACTS_COUNT:', contacts.length);
  } catch (err) {
    console.error(err);
  }
}
run();
