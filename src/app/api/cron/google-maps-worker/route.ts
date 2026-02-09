import { NextResponse } from 'next/server';
import directus from '@/lib/directus';
import { readItems, updateItem, createItem } from '@directus/sdk';
import { getSystemApiKeys, updateApiKeyUsage } from '@/app/actions/google-maps-keys';
import { searchBusinesses, getPlaceDetails } from '@/app/actions/google-maps';
import { SLOVAKIA_CITIES, CITY_COORDINATES } from '@/tools/google-maps/constants';

const JOBS_COLLECTION = 'google_maps_jobs';
const LEADS_COLLECTION = 'cold_leads';

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
    let currentJobId = null;
    
    try {
        console.log("--- [GMAP WORKER] Starting Background Check ---");
        
        // 1. Fetch active jobs
        const jobs = await directus.request(readItems(JOBS_COLLECTION, {
            filter: {
                status: { _in: ['queued', 'processing', 'paused'] }
            },
            limit: 1,
            sort: ['date_created']
        }));

        if (!jobs || jobs.length === 0) {
            console.log("[GMAP WORKER] No active jobs in queue.");
            return NextResponse.json({ message: "No jobs to process." });
        }

        const job = jobs[0] as any;
        currentJobId = job.id;
        console.log(`[GMAP WORKER] Processing Job: ${job.id} | Term: "${job.search_term}" | Loc: ${job.location}`);

        // Update status to processing immediately to show activity
        if (job.status === 'queued') {
            await directus.request(updateItem(JOBS_COLLECTION, job.id, { status: 'processing', last_error: null }));
        }

        // 2. Fetch Keys
        console.log("[GMAP WORKER] Fetching API keys...");
        const keys = await getSystemApiKeys();
        const activeKeys = keys.filter(k => (k.usageToday || 0) < 300);

        console.log(`[GMAP WORKER] Found ${activeKeys.length} active keys out of ${keys.length} total.`);

        if (activeKeys.length === 0) {
            console.warn("[GMAP WORKER] ABORT: No available API keys (usage limits hit).");
            await directus.request(updateItem(JOBS_COLLECTION, job.id, { 
                status: 'paused', 
                last_error: "Limit dosiahnutý: Všetky Google API kľúče vyčerpali denný limit (300/300)." 
            }));
            return NextResponse.json({ message: "No available API keys." });
        }

        // 3. Setup Iteration
        const normalizedLoc = job.location.toLowerCase();
        const targetLocations = (normalizedLoc.includes('slovensko') || normalizedLoc === 'sk') ? SLOVAKIA_CITIES : getOrderedLocations(job.location);
        
        let cityIndex = job.current_city_index || 0;
        let pageToken = job.next_page_token || undefined;
        let totalFound = job.found_count || 0;
        let foundThisRun = 0;
        const limitPerRun = 10; // Reduced for more frequent updates and better resilience

        console.log(`[GMAP WORKER] Iteration Start: CityIndex ${cityIndex}, TotalFound ${totalFound}, PageToken: ${pageToken ? 'YES' : 'NO'}`);

        // 4. Execution Loop
        const startTime = Date.now();
        const MAX_RUNTIME = 20000; // 20 seconds to stay safely within serverless limits

        while (totalFound < job.limit && (Date.now() - startTime) < MAX_RUNTIME && foundThisRun < limitPerRun) {
            const currentCity = targetLocations[cityIndex];
            if (!currentCity) {
                console.log("[GMAP WORKER] No more cities in list. Finishing.");
                break;
            }

            console.log(`[GMAP WORKER] Searching in: ${currentCity} (Index: ${cityIndex})`);

            const currentKey = activeKeys.find(k => (k.usageToday || 0) < 300);
            if (!currentKey) {
                console.warn("[GMAP WORKER] Out of keys during run.");
                break;
            }

            try {
                // Search Businesses
                console.log(`[GMAP WORKER] Calling Google Maps Search API...`);
                const query = `${job.search_term} in ${currentCity}`;
                const searchResult: any = await searchBusinesses(currentKey.key, query, pageToken);

                // Update key usage immediately after call
                currentKey.usageToday = (currentKey.usageToday || 0) + 1;
                await updateApiKeyUsage(currentKey.id, { usageToday: currentKey.usageToday, lastUsed: new Date().toISOString() });

                if (!searchResult.results?.length) {
                    console.log(`[GMAP WORKER] No results found in ${currentCity}. Skipping to next city.`);
                    cityIndex++;
                    pageToken = undefined;
                    continue;
                }

                console.log(`[GMAP WORKER] Found ${searchResult.results.length} raw results.`);

                // Process Individual Results
                for (const rawPlace of searchResult.results) {
                    if (totalFound >= job.limit || foundThisRun >= limitPerRun) break;
                    
                    console.log(`[GMAP WORKER] Fetching details for: ${rawPlace.name}`);
                    
                    // Update usage for details call
                    currentKey.usageToday = (currentKey.usageToday || 0) + 1;
                    await updateApiKeyUsage(currentKey.id, { usageToday: currentKey.usageToday, lastUsed: new Date().toISOString() });
                    
                    const details: any = await getPlaceDetails(currentKey.key, rawPlace.place_id);
                    if (details) {
                        const newLead = {
                            title: details.name,
                            website: details.website,
                            phone: details.formatted_phone_number || details.international_phone_number,
                            city: details.formatted_address || currentCity,
                            google_maps_url: details.url,
                            google_maps_job_id: job.id,
                            source_city: currentCity,
                            status: 'lead',
                            user_email: job.owner_email,
                            list_name: job.target_list || job.search_term
                        };

                        console.log(`[GMAP WORKER] Saving lead: ${newLead.title}`);
                        await directus.request(createItem(LEADS_COLLECTION, newLead));

                        totalFound++;
                        foundThisRun++;

                        // Update progress in job immediately
                        await directus.request(updateItem(JOBS_COLLECTION, job.id, {
                            found_count: totalFound
                        }));
                    }
                }

                // Prepare next page or next city
                if (searchResult.next_page_token && totalFound < job.limit) {
                    console.log("[GMAP WORKER] Moving to next page...");
                    pageToken = searchResult.next_page_token;
                    // Important: Google PageToken needs ~2 seconds to become active
                    await new Promise(r => setTimeout(r, 2000));
                } else {
                    console.log("[GMAP WORKER] City finished. Moving to next city.");
                    cityIndex++;
                    pageToken = undefined;
                }

            } catch (loopErr: any) {
                console.error("[GMAP WORKER] Loop Error:", loopErr.message);
                await directus.request(updateItem(JOBS_COLLECTION, job.id, { last_error: `Chyba v slučke: ${loopErr.message}` }));
                break;
            }
        }

        // 5. Final Batch State Sync
        const isFinished = totalFound >= job.limit;
        const nextStatus = isFinished ? 'completed' : 'processing';
        
        console.log(`[GMAP WORKER] Batch Done. New Status: ${nextStatus} | Total: ${totalFound}/${job.limit}`);

        await directus.request(updateItem(JOBS_COLLECTION, job.id, {
            status: nextStatus,
            found_count: totalFound,
            current_city_index: cityIndex,
            next_page_token: pageToken || null,
            last_error: isFinished ? null : job.last_error // Clear error if finished
        }));

        // 6. Turbo Ping (Self-recursion)
        if (!isFinished && foundThisRun > 0) {
            console.log("[GMAP WORKER] Sending self-ping for next batch...");
            const proto = request.headers.get("x-forwarded-proto") || "http";
            const host = request.headers.get("host");
            const nextUrl = `${proto}://${host}/api/cron/google-maps-worker`;
            fetch(nextUrl, { headers: { 'Cache-Control': 'no-cache' }}).catch(() => {});
        }

        return NextResponse.json({ 
            success: true, 
            status: nextStatus, 
            total_found: totalFound,
            processed_this_run: foundThisRun
        });

    } catch (error: any) {
        console.error("[GMAP WORKER] FATAL ERROR:", error);
        if (currentJobId) {
            await directus.request(updateItem(JOBS_COLLECTION, currentJobId, { 
                last_error: `Fatálna chyba worker-a: ${error.message}` 
            }));
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
