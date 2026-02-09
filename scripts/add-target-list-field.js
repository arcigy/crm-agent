const DIRECTUS_URL = "https://directus-buk1-production.up.railway.app";
const DIRECTUS_TOKEN = "3cSXW-vP-3ujjyXvS0-htoPcsSQOZ5GE";

async function addTargetListField() {
    console.log(`Adding target_list to google_maps_jobs...`);
    try {
        const response = await fetch(`${DIRECTUS_URL}/fields/google_maps_jobs`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${DIRECTUS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                field: "target_list",
                type: "string",
                meta: {
                    interface: "input",
                    readonly: false,
                    hidden: false,
                    width: "full",
                    note: "Názov zoznamu, do ktorého sa uložia nájdené leady"
                }
            })
        });
        const data = await response.json();
        if (response.ok) {
            console.log(`✅ Success: target_list added to google_maps_jobs`);
        } else {
            console.log(`⚠️ Warning/Error:`, JSON.stringify(data.errors));
        }
    } catch (e) {
        console.error(`❌ Fetch failed:`, e.message);
    }
}

addTargetListField();
