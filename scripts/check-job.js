const DIRECTUS_URL = "https://directus-buk1-production.up.railway.app";
const DIRECTUS_TOKEN = "3cSXW-vP-3ujjyXvS0-htoPcsSQOZ5GE";

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
