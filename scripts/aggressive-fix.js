const DIRECTUS_URL = "https://directus-buk1-production.up.railway.app";
const DIRECTUS_TOKEN = "3cSXW-vP-3ujjyXvS0-htoPcsSQOZ5GE";

const headers = {
    'Authorization': `Bearer ${DIRECTUS_TOKEN}`,
    'Content-Type': 'application/json'
};

async function aggressiveFix() {
    console.log("--- Aggressive Schema Fix ---");

    const fieldsToFix = [
        { collection: "google_maps_jobs", field: "status", length: 1000 },
        { collection: "agent_chats", field: "status", length: 1000 },
        { collection: "cold_leads", field: "status", length: 1000 },
        { collection: "google_tokens", field: "user_email", length: 1000 }
    ];

    for (const f of fieldsToFix) {
        console.log(`Fixing ${f.collection}.${f.field}...`);
        try {
            const res = await fetch(`${DIRECTUS_URL}/fields/${f.collection}/${f.field}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({
                    schema: {
                        max_length: f.length,
                        data_type: "text"
                    },
                    meta: {
                        validation: null,
                        validation_message: null
                    }
                })
            });
            if (res.ok) console.log(`✅ ${f.collection}.${f.field} updated`);
            else console.log(`❌ Error ${f.collection}.${f.field}: ${res.status}`);
        } catch (e) {
            console.error(e);
        }
    }

    // Also clear cache again
    await fetch(`${DIRECTUS_URL}/utils/cache/clear`, { method: 'POST', headers });
    console.log("✅ Cache cleared");
    console.log("--- Done ---");
}

aggressiveFix();
