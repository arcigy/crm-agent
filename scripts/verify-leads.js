const DIRECTUS_URL = "https://directus-buk1-production.up.railway.app";
const DIRECTUS_TOKEN = "3cSXW-vP-3ujjyXvS0-htoPcsSQOZ5GE";

async function checkLeads() {
    const jobId = 9;
    console.log(`Checking leads for Job ID: ${jobId}...`);
    try {
        // Fetch leads for job 9
        const response = await fetch(`${DIRECTUS_URL}/items/cold_leads?filter[google_maps_job_id][_eq]=${jobId}&limit=100`, {
            headers: {
                'Authorization': `Bearer ${DIRECTUS_TOKEN}`
            }
        });
        const data = await response.json();
        
        if (data.data) {
            console.log(`Found ${data.data.length} leads in database for job ${jobId}:`);
            data.data.forEach((lead, i) => {
                console.log(`${i + 1}. ${lead.title} (${lead.city})`);
            });
        } else {
            console.log("No leads found or error in response:", data);
        }
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

checkLeads();
