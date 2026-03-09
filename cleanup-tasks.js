const https = require('https');

const DIRECTUS_URL = 'https://directus-buk1-production.up.railway.app';
const TOKEN = '3cSXW-vP-3ujjyXvS0-htoPcsSQOZ5GE';

function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, DIRECTUS_URL);
    const options = {
      method,
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body ? JSON.parse(body) : null);
        } else {
          reject(new Error(`Status ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function cleanupDuplicates() {
  try {
    const response = await request('GET', '/items/crm_tasks?limit=500');
    const tasks = response.data;
    const seen = new Set();
    const toDelete = [];

    for (const task of tasks) {
      const key = `${task.title}|${task.user_email}|${task.due_date}|${task.completed}`;
      if (seen.has(key)) {
        toDelete.push(task.id);
      } else {
        seen.add(key);
      }
    }

    console.log(`Found ${toDelete.length} duplicates to delete.`);

    for (const id of toDelete) {
      process.stdout.write(`Deleting ${id}... `);
      await request('DELETE', `/items/crm_tasks/${id}`);
      process.stdout.write('Done\n');
    }
    
    console.log('Cleanup complete.');
  } catch (error) {
    console.error('Error during cleanup:', error.message);
  }
}

cleanupDuplicates();
