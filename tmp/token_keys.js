const { Client } = require('pg');
const client = new Client({ connectionString: 'postgres://postgres:Automatizacie#2025@postgres-buk1.up.railway.app:5432/railway' });
client.connect().then(async () => {
    const res = await client.query("SELECT * FROM google_tokens LIMIT 1");
    console.log(Object.keys(res.rows[0]));
    await client.end();
}).catch(err => {
    console.error(err);
    process.exit(1);
});
