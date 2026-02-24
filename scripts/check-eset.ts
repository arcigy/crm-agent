import directus from '../src/lib/directus';
import { readItems } from '@directus/sdk';

async function checkEset() {
  const contacts = await directus.request(readItems('contacts', {
    filter: { company: { _icontains: "eset" } }
  }));
  console.log(JSON.stringify(contacts, null, 2));
}
checkEset();
