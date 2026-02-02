
const DIRECTUS_URL = "https://directus-buk1-production.up.railway.app";
const DIRECTUS_TOKEN = "3cSXW-vP-3ujjyXvS0-htoPcsSQOZ5GE";

const collectionsToUpdate = [
    "contacts",
    "projects",
    "deals",
    "crm_tasks",
    "ai_personalization",
    "email_analysis",
    "crm_notes",
    "activities"
];

async function addColumn(collection, field, type = "string") {
    console.log(`Adding ${field} to ${collection}...`);
    try {
        const response = await fetch(`${DIRECTUS_URL}/fields/${collection}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${DIRECTUS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                field: field,
                type: type,
                meta: {
                    interface: "input",
                    readonly: false,
                    hidden: false,
                    width: "full"
                }
            })
        });
        const data = await response.json();
        if (response.ok) {
            console.log(`✅ Success: ${field} added to ${collection}`);
        } else {
            console.log(`⚠️ Warning/Error in ${collection}:`, JSON.stringify(data.errors));
        }
    } catch (e) {
        console.error(`❌ Fetch failed for ${collection}:`, e.message);
    }
}

async function run() {
    // Add user_email to all relevant collections
    for (const col of collectionsToUpdate) {
        await addColumn(col, "user_email");
    }

    // Add onboarding fields to crm_users
    await addColumn("crm_users", "onboarding_completed", "boolean");
    await addColumn("crm_users", "company_name");
    await addColumn("crm_users", "industry");
    await addColumn("crm_users", "nickname");
    await addColumn("crm_users", "profession");
    await addColumn("crm_users", "about_me", "text");
    await addColumn("crm_users", "custom_instructions", "text");
}

run();
