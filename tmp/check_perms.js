const https = require('https');

const HOST = 'directus-buk1-production.up.railway.app';
const TOKEN = '3cSXW-vP-3ujjyXvS0-htoPcsSQOZ5GE';

function request(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: HOST,
            port: 443,
            path: path,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${TOKEN}`
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                const parsed = JSON.parse(data || '{}');
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(parsed);
                } else {
                    reject(new Error(`Status ${res.statusCode}: ${JSON.stringify(parsed)}`));
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.end();
    });
}

(async () => {
    try {
        console.log('Checking contact_labels fields...');
        const fieldsRes = await request('/fields/contact_labels');
        const fields = fieldsRes.data.map(f => f.field);
        console.log('Fields in contact_labels:', fields);

    } catch (err) {
        console.error('Error:', err.message);
    }
})();
