const DIRECTUS_URL = "https://directus-buk1-production.up.railway.app";
const DIRECTUS_TOKEN = "3cSXW-vP-3ujjyXvS0-htoPcsSQOZ5GE";

const headers = {
    'Authorization': `Bearer ${DIRECTUS_TOKEN}`,
    'Content-Type': 'application/json'
};

async function forceTextType() {
    console.log("Forcing google_maps_jobs.status to TEXT type (explicit schema)...");
    try {
        const response = await fetch(`${DIRECTUS_URL}/fields/google_maps_jobs/status`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
                type: "text",
                schema: {
                    data_type: "text"
                }
            })
        });
        const data = await response.json();
        if (response.ok) {
            console.log("✅ status type changed to text");
        } else {
            console.log("❌ Error:", JSON.stringify(data.errors || data));
        }
    } catch (e) { console.error(e); }
}

forceTextType();
