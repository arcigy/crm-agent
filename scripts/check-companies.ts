import directus from '../src/lib/directus';
import { readItems } from '@directus/sdk';

async function checkCompanies() {
  try {
    const contacts = await directus.request(readItems('contacts', {
      limit: -1,
      fields: ['id', 'first_name', 'last_name', 'company']
    }));
    const withCompany = contacts.filter((c: any) => c.company && c.company.trim() !== '' && c.company !== '-');
    console.log('Kontakty s firmou:');
    withCompany.forEach((c: any) => console.log(`- ${c.first_name} ${c.last_name} (${c.company})`));
  } catch (err) {
    console.error(err);
  }
}
checkCompanies();
