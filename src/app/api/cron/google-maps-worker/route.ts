import { NextResponse } from 'next/server';
import directus from '@/lib/directus';
import { readItems, updateItem, createItems } from '@directus/sdk';
import { getSystemApiKeys, updateApiKeyUsage } from '@/app/actions/google-maps-keys';
import { searchBusinesses, getPlaceDetails } from '@/app/actions/google-maps';
import { SLOVAKIA_CITIES, CITY_COORDINATES } from '@/tools/google-maps/constants';

const JOBS_COLLECTION = 'google_maps_jobs';
const LEADS_COLLECTION = 'contacts'; // Or cold_leads if separate

// Standard distance formula
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const getOrderedLocations = (startLocation: string) => {
    const startCoords = CITY_COORDINATES[startLocation];
    if (!startCoords) return [startLocation];
    return Object.keys(CITY_COORDINATES).sort((a, b) => {
        const distA = getDistance(startCoords.lat, startCoords.lng, CITY_COORDINATES[a].lat, CITY_COORDINATES[a].lng);
        const distB = getDistance(startCoords.lat, startCoords.lng, CITY_COORDINATES[b].lat, CITY_COORDINATES[b].lng);
        return distA - distB;
    });
};

export async function GET(request: Request) {
    try {
        console.log("--- Background Worker: Starting Check ---");
        
        // 1. Fetch active jobs
        const jobs = await directus.request(readItems(JOBS_COLLECTION, {
            filter: {
                status: { _in: ['queued', 'processing', 'paused'] }
            },
            limit: 1,
            sort: ['date_created']
        }));

        if (!jobs || jobs.length === 0) {
            return NextResponse.json({ message: "No jobs to process." });
        }

        const job = jobs[0] as any;
        console.log(`Processing Job ID: ${job.id} (${job.search_term} in ${job.location})`);

        // 2. Fetch Keys
        const keys = await getSystemApiKeys();
        const activeKeys = keys.filter(k => (k.usageToday || 0) < 300);

        if (activeKeys.length === 0) {
            await directus.request(updateItem(JOBS_COLLECTION, job.id, { status: 'paused' }));
            return NextResponse.json({ message: "No available API keys (all limits reached)." });
        }

        // 3. Setup Iteration
        const targetLocations = (job.location.toLowerCase().includes('slovensko')) ? SLOVAKIA_CITIES : getOrderedLocations(job.location);
        let cityIndex = job.current_city_index || 0;
        let pageToken = job.next_page_token || undefined;
        let totalFound = job.found_count || 0;
        let foundThisRun = 0;
        const limitPerRun = 15; // Process in small batches to avoid timeouts

        // 4. Execution Loop (Limited to avoid timeout)
        const startTime = Date.now();
        const MAX_RUNTIME = 25000; // 25 seconds safety margin

        while (totalFound < job.limit && (Date.now() - startTime) < MAX_RUNTIME && foundThisRun < limitPerRun) {
            const currentCity = targetLocations[cityIndex];
            if (!currentCity) break;

            const currentKey = activeKeys.find(k => (k.usageToday || 0) < 300);
            if (!currentKey) break;

            try {
                // Update key usage
                currentKey.usageToday = (currentKey.usageToday || 0) + 1;
                await updateApiKeyUsage(currentKey.id, { usageToday: currentKey.usageToday, lastUsed: new Date().toISOString() });

                const query = `${job.search_term} in ${currentCity}`;
                const searchResult: any = await searchBusinesses(currentKey.key, query, pageToken);

                if (!searchResult.results?.length) {
                    cityIndex++;
                    pageToken = undefined;
                    continue;
                }

                // Process Results
                const leadsToCreate = [];
                for (const rawPlace of searchResult.results) {
                    if (totalFound >= job.limit || foundThisRun >= limitPerRun) break;
                    
                    // Get Details
                    currentKey.usageToday = (currentKey.usageToday || 0) + 1;
                    await updateApiKeyUsage(currentKey.id, { usageToday: currentKey.usageToday, lastUsed: new Date().toISOString() });
                    
                    const details: any = await getPlaceDetails(currentKey.key, rawPlace.place_id);
                    if (details) {
                        leadsToCreate.push({
                            title: details.name,
                            company_name_reworked: details.name,
                            website: details.website,
                            phone: details.formatted_phone_number || details.international_phone_number,
                            city: currentCity,
                            google_maps_url: details.url,
                            source_keyword: job.search_term,
                            source_city: currentCity,
                            status: 'active', // default for contacts
                            list_name: `GMap Scrape - ${job.search_term} - ${new Date(job.date_created).toLocaleDateString()}`
                        });
                        totalFound++;
                        foundThisRun++;
                    }
                }

                // Save Leads
                if (leadsToCreate.length > 0) {
                    await directus.request(createItems(LEADS_COLLECTION, leadsToCreate));
                }

                // Update Progress State
                if (searchResult.next_page_token && totalFound < job.limit) {
                    pageToken = searchResult.next_page_token;
                } else {
                    cityIndex++;
                    pageToken = undefined;
                }

            } catch (err) {
                console.error("Worker Execution Error", err);
                break;
            }
        }

        // 5. Final Status Update
        const nextStatus = totalFound >= job.limit ? 'completed' : 'processing';
        await directus.request(updateItem(JOBS_COLLECTION, job.id, {
            status: nextStatus,
            found_count: totalFound,
            current_city_index: cityIndex,
            next_page_token: pageToken || null
        }));

        // 6. Turbo Mode: If not finished, ping itself to start next batch immediately
        if (nextStatus === 'processing') {
            const proto = request.headers.get("x-forwarded-proto") || "http";
            const host = request.headers.get("host");
            const nextUrl = `${proto}://${host}/api/cron/google-maps-worker`;
            fetch(nextUrl, { headers: { 'Cache-Control': 'no-cache' }}).catch(() => {});
        }

        console.log(`Worker Finished. Job Status: ${nextStatus}, Total Found: ${totalFound}`);
        return NextResponse.json({ 
            success: true, 
            status: nextStatus, 
            total_found: totalFound,
            batch_found: foundThisRun
        });

    } catch (error: any) {
        console.error("CRON Fatal Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
