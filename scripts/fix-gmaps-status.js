const DIRECTUS_URL = "https://directus-buk1-production.up.railway.app";
const DIRECTUS_TOKEN = "3cSXW-vP-3ujjyXvS0-htoPcsSQOZ5GE";

async function updateFieldLength(collection, field) {
    console.log(`Updating ${field} in ${collection} to allow longer strings...`);
    try {
        const response = await fetch(`${DIRECTUS_URL}/fields/${collection}/${field}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${DIRECTUS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
               "schema": {
                    "max_length": 50 // Increase to safe limit (processing is 10, completed is 9)
               }
            })
        });

        if (response.ok) {
             const data = await response.json();
             console.log(`✅ Success: ${field} updated in ${collection}`);
        } else {
             const data = await response.json();
             console.log(`❌ Error updating ${field}:`, JSON.stringify(data));
        }
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

updateFieldLength("google_maps_jobs", "status");
