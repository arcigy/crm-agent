const DIRECTUS_URL = "https://directus-buk1-production.up.railway.app";
const DIRECTUS_TOKEN = "3cSXW-vP-3ujjyXvS0-htoPcsSQOZ5GE";

const headers = {
    'Authorization': `Bearer ${DIRECTUS_TOKEN}`,
    'Content-Type': 'application/json'
};

async function fixPermissions() {
    console.log("--- Fixing Permissions ---");
    const roleId = "f32e8e66-4ada-4d20-b2e8-06398d91c886";
    const collections = ["google_tokens", "agent_chats", "google_maps_jobs", "cold_leads"];

    for (const collection of collections) {
        console.log(`Granting permissions for ${collection}...`);
        try {
            // Try to create a permission entry that allows everything for this role
            // action: read, write, create, delete
            const actions = ["read", "create", "update", "delete"];
            for (const action of actions) {
                const res = await fetch(`${DIRECTUS_URL}/permissions`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        role: roleId,
                        collection: collection,
                        action: action,
                        fields: ["*"],
                        permissions: {},
                        validation: {}
                    })
                });
                const data = await res.json();
                if (res.ok) console.log(`✅ Granted ${action} on ${collection}`);
                else if (action === 'read' && data.errors?.[0]?.extensions?.code === 'RECORD_NOT_UNIQUE') {
                     // Already exists, try to update it?
                     console.log(`ℹ️ ${action} on ${collection} already exists, attempting update...`);
                     // We would need the permission ID to update... skipping for now as it probably has some restricted fields
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
