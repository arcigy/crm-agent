const { Client } = require('pg');
const client = new Client({ connectionString: 'postgres://postgres:Automatizacie#2025@postgres-buk1.up.railway.app:5432/railway' });
client.connect().then(async () => {
    const res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'google_tokens'");
    console.log(JSON.stringify(res.rows, null, 2));
    await client.end();
}).catch(err => {
    console.error(err);
    process.exit(1);
});
