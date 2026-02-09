const DIRECTUS_URL = "https://directus-buk1-production.up.railway.app";
const DIRECTUS_TOKEN = "3cSXW-vP-3ujjyXvS0-htoPcsSQOZ5GE";

const headers = {
    'Authorization': `Bearer ${DIRECTUS_TOKEN}`,
    'Content-Type': 'application/json'
};

async function fixSchema() {
    console.log("--- Starting Schema Fixes ---");

    // 1. Add 'status' to agent_chats
    console.log("Fixing agent_chats...");
    try {
        await fetch(`${DIRECTUS_URL}/fields/agent_chats`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                field: "status",
                type: "string",
                meta: { interface: "select", options: { choices: [{text: "Active", value: "active"}, {text: "Archived", value: "archived"}] } },
                schema: { default_value: "active", max_length: 20 }
            })
        });
        console.log("✅ status field added/checked in agent_chats");
    } catch (e) { console.error("Error in agent_chats:", e); }

    // 2. Add 'user_email' to google_tokens
    console.log("Fixing google_tokens...");
    try {
        await fetch(`${DIRECTUS_URL}/fields/google_tokens`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                field: "user_email",
                type: "string",
                meta: { interface: "input" },
                schema: { max_length: 100 }
            })
        });
        console.log("✅ user_email field added/checked in google_tokens");
    } catch (e) { console.error("Error in google_tokens:", e); }

    // 3. Force change google_maps_jobs.status to text (no limit) to avoid "too long" errors
    console.log("Fixing google_maps_jobs status...");
    try {
        // First try to change the schema to text if it's currently character varying
        // Or just set a very high max_length
        await fetch(`${DIRECTUS_URL}/fields/google_maps_jobs/status`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
                schema: {
                    max_length: 255 // More than enough
                }
            })
        });
        console.log("✅ status max_length increased in google_maps_jobs");
    } catch (e) { console.error("Error in google_maps_jobs:", e); }

    console.log("--- Schema Fixes Done ---");
}

fixSchema();
