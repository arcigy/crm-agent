const DIRECTUS_URL = "https://directus-buk1-production.up.railway.app";
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN;
if (!DIRECTUS_TOKEN) throw new Error("DIRECTUS_TOKEN env variable is required");

async function checkJob10() {
    console.log("Checking leads for Job 10...");
    try {
        const res = await fetch(`${DIRECTUS_URL}/items/cold_leads?filter[google_maps_job_id][_eq]=10`, {
            headers: { 'Authorization': `Bearer ${DIRECTUS_TOKEN}` }
        });
        const data = await res.json();
        console.log(`Total leads found for Job 10: ${data.data?.length}`);
        data.data?.forEach(l => console.log(`- ${l.title}`));
    } catch (e) {
        console.error(e);
    }
}

checkJob10();
