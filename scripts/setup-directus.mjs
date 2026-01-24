import { createDirectus, rest, staticToken, authentication, createCollection, createField, createPermission, createItem } from '@directus/sdk';

const DIRECTUS_URL = 'http://localhost:8055';
const EMAIL = 'laubertbb@gmail.com';
const PASSWORD = 'HESLO123';

async function setup() {
  console.log('Connecting to Directus...');
  const client = createDirectus(DIRECTUS_URL)
    .with(authentication('json', { autoRefresh: true })) // explicit
    .with(rest());

  try {
    // Try passing credentials as object
    await client.login(EMAIL, PASSWORD);
    console.log('Logged in.');

    // 1. Create Collection 'articles'
    try {
        await client.request(createCollection({
            collection: 'articles',
            schema: {},
            meta: { sort: 1, hidden: false, icon: 'newspaper' }
        }));
        console.log("Collection 'articles' created.");
    } catch (e) {
        if (e.errors?.[0]?.extensions?.code === 'RECORD_NOT_UNIQUE') {
            console.log("Collection 'articles' already exists.");
        } else {
             // If collection exists but schema not, directus might throw.
             // Just ignore for now.
             console.log("Collection creation check:", e.message);
        }
    }

    // 2. Create Field 'title'
    try {
        await client.request(createField('articles', {
            field: 'title',
            type: 'string',
            schema: { is_nullable: false },
            meta: { interface: 'input', display: 'raw', required: true }
        }));
        console.log("Field 'title' created.");
    } catch (e) {
         console.log("Field 'title' skipped/failed.", e.message);
    }

    // 3. Create Field 'content'
    try {
        await client.request(createField('articles', {
            field: 'content',
            type: 'text',
            schema: {},
            meta: { interface: 'input-rich-text-html', display: 'formatted' }
        }));
        console.log("Field 'content' created.");
    } catch (e) {
         console.log("Field 'content' skipped/failed.", e.message);
    }

    // 4. Set Public Permissions (Read)
    try {
        await client.request(createPermission({
            role: null, 
            collection: 'articles',
            action: 'read',
            fields: ['*']
        }));
        console.log("Public Read permission set.");
    } catch (e) {
        console.log("Permission setup skipped/failed.", e.message);
    }

    // 5. Create a sample article
    try {
        await client.request(createItem('articles', {
            title: 'Hello Directus!',
            content: '<p>This is content fetched from Directus.</p>'
        }));
        console.log("Sample article created.");
    } catch (e) {
        console.log("Sample item creation skipped/failed.", e.message);
    }

    console.log('Setup complete!');

  } catch (error) {
    console.error('Setup failed:', error);
  }
}

setup();
