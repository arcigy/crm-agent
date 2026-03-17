
const DIRECTUS_URL = 'https://directus-buk1-production.up.railway.app';
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN;
if (!DIRECTUS_TOKEN) throw new Error("DIRECTUS_TOKEN is required");

async function setupCollection() {
  const headers = {
    'Authorization': `Bearer ${DIRECTUS_TOKEN}`,
    'Content-Type': 'application/json'
  };

  try {
    console.log('Creating collection ai_audit_logs...');
    const res = await fetch(`${DIRECTUS_URL}/collections`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        collection: 'ai_audit_logs',
        schema: {},
        meta: {
          display_template: '{{timestamp}} - {{model}}',
          icon: 'analytics',
          note: 'Persistent AI usage and cost tracking'
        }
      })
    });
    const data = await res.json();
    if (res.ok) {
       console.log('Collection created.');
    } else {
       console.log('Collection setup message:', data.errors?.[0]?.message || data);
    }
  } catch (e) {
    console.error('Failed to create collection:', e.message);
  }

  const fields = [
    { field: 'user_id', type: 'uuid', meta: { interface: 'input' } },
    { field: 'user_email', type: 'string', meta: { interface: 'input' } },
    { field: 'model', type: 'string', meta: { interface: 'input' } },
    { field: 'mission_summary', type: 'text', meta: { interface: 'textarea' } },
    { field: 'input_tokens', type: 'integer', meta: { interface: 'input' } },
    { field: 'output_tokens', type: 'integer', meta: { interface: 'input' } },
    { field: 'estimated_cost_usd', type: 'decimal', meta: { interface: 'numeric', options: { precision: 10, scale: 6 } } },
    { field: 'tool_calls_count', type: 'integer', meta: { interface: 'input' } },
    { field: 'success', type: 'boolean', meta: { interface: 'boolean' } },
    { field: 'session_id', type: 'string', meta: { interface: 'input' } }
  ];

  for (const f of fields) {
    try {
      console.log(`Creating field ${f.field}...`);
      const res = await fetch(`${DIRECTUS_URL}/fields/ai_audit_logs`, {
        method: 'POST',
        headers,
        body: JSON.stringify(f)
      });
      if (res.ok) {
        console.log(`Field ${f.field} created.`);
      } else {
        const data = await res.json();
        console.log(`Field ${f.field} status:`, data.errors?.[0]?.message || data);
      }
    } catch (e) {
      console.log(`Field ${f.field} failed:`, e.message);
    }
  }
  console.log('Setup finished.');
}

setupCollection();
