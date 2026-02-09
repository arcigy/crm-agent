const DIRECTUS_URL = "https://directus-buk1-production.up.railway.app";
const DIRECTUS_TOKEN = "3cSXW-vP-3ujjyXvS0-htoPcsSQOZ5GE";

const headers = {
    'Authorization': `Bearer ${DIRECTUS_TOKEN}`,
    'Content-Type': 'application/json'
};

async function fixPermissions() {
    console.log("--- Fixing Permissions (v11 Policy style) ---");
    const policyId = "1b9dc469-aab8-482b-9ff0-9f218e40ac3d"; // Administrator Policy
    const collections = ["google_tokens", "agent_chats", "google_maps_jobs", "cold_leads"];

    for (const collection of collections) {
        console.log(`Granting permissions for ${collection}...`);
        try {
            const actions = ["read", "create", "update", "delete"];
            for (const action of actions) {
                const res = await fetch(`${DIRECTUS_URL}/permissions`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        policy: policyId,
                        collection: collection,
                        action: action,
                        fields: ["*"],
                        permissions: {},
                        validation: {}
                    })
                });
                const data = await res.json();
                if (res.ok) console.log(`✅ Granted ${action} on ${collection}`);
                else if (data.errors?.[0]?.extensions?.code === 'RECORD_NOT_UNIQUE') {
                     console.log(`ℹ️ ${action} on ${collection} already exists.`);
                } else {
                    console.log(`❌ Error ${action} on ${collection}:`, JSON.stringify(data.errors || data));
                }
            }
        } catch (e) {
            console.error(e);
        }
    }
    console.log("--- Done ---");
}

fixPermissions();
