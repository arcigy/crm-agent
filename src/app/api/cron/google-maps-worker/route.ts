import { NextResponse } from 'next/server';
import directus from '@/lib/directus';
import { readItems, updateItem, createItem } from '@directus/sdk';
import { getSystemApiKeys } from '@/app/actions/google-maps-keys';
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
    let jobLogs: string[] = [];
    let totalFound = 0;
    let foundThisRun = 0;
    let totalCallsThisBatch = 0;
    const keysFailures: Record<string, number> = {};

    const addLog = async (jobId: string, msg: string) => {
        const timestamp = new Date().toLocaleTimeString();
        const formattedMsg = `[${timestamp}] ${msg}`;
        jobLogs.push(formattedMsg);
        if (jobLogs.length > 50) jobLogs.shift();
        
        try {
            await directus.request(updateItem(JOBS_COLLECTION, jobId, { 
                logs: jobLogs.join('\n') 
            }));
        } catch (e) {
            console.error("Failed to save log to DB", e);
        }
    };

    // Helper to update key usage in DB reliably
    const syncKeyUsage = async (keyObj: any, callsDone: number) => {
        if (callsDone <= 0) return;
        try {
            keyObj.usageToday += callsDone;
            keyObj.usageMonth += callsDone;
            const isLimitReached = keyObj.usageToday >= (keyObj.usageLimit || 300);
            
            console.log(`[DEBUG] Syncing ${callsDone} calls for key: ${keyObj.label}. New today: ${keyObj.usageToday}`);
            
            await directus.request(updateItem('google_maps_keys', keyObj.id, { 
                usage_today: keyObj.usageToday, 
                usage_month: keyObj.usageMonth,
                last_used: new Date().toISOString(),
                status: isLimitReached ? 'limit_reached' : (keyObj.status === 'error' ? 'error' : 'active'),
                error_message: keyObj.errorMessage || ''
            }));
            return true;
        } catch (e) {
            console.error(`[CRITICAL] Failed to sync usage for key ${keyObj.label}:`, e);
            return false;
        }
    };
    
    try {
        console.log("--- [GMAP WORKER] Starting Optimized Background Scraper ---");
        
        // 1. Fetch active jobs
        const jobs = await directus.request(readItems(JOBS_COLLECTION, {
            filter: { status: { _in: ['w', 'p'] } },
            limit: 1,
            sort: ['date_created']
        }));

        if (!jobs || jobs.length === 0) return NextResponse.json({ message: "No jobs to process." });

        const job = jobs[0] as any;
        currentJobId = job.id;
        jobLogs = job.logs ? job.logs.split('\n') : [];
        totalFound = job.found_count || 0;

        await directus.request(updateItem(JOBS_COLLECTION, job.id, { status: 'r', last_error: null }));
        if (job.status !== 'r') await addLog(job.id, "🚀 Štartujem optimalizovaný scraper...");

        // 2. Fetch Keys
        const keys = await getSystemApiKeys();
        let activeKeys = keys.filter(k => (k.usageToday || 0) < (k.usageLimit || 300) && k.status !== 'error');

        if (activeKeys.length === 0) {
            const errorMsg = "Limit dosiahnutý: Žiadne dostupné kľúče.";
            await directus.request(updateItem(JOBS_COLLECTION, job.id, { status: 'p', last_error: errorMsg }));
            await addLog(job.id, `❌ ${errorMsg}`);
            return NextResponse.json({ message: "No available API keys." });
        }

        // 3. Setup Iteration
        const normalizedLoc = job.location.toLowerCase();
        const targetLocations = (normalizedLoc.includes('slovensko') || normalizedLoc === 'sk') ? SLOVAKIA_CITIES : getOrderedLocations(job.location);
        
        let cityIndex = job.current_city_index || 0;
        let pageToken = job.next_page_token || undefined;
        let currentKey = activeKeys.sort((a, b) => (a.usageToday || 0) - (b.usageToday || 0))[0];
        
        const limitPerRun = 100;
        const startTime = Date.now();
        const MAX_RUNTIME = 45000; // Stay safe within server limits

        // 4. Execution Loop (Paged Sections)
        while (totalFound < job.limit && (Date.now() - startTime) < MAX_RUNTIME && foundThisRun < limitPerRun) {
            // Heartbeat check
            const currentJobStatus: any = await directus.request(readItems(JOBS_COLLECTION, {
                filter: { id: { _eq: job.id } },
                fields: ['status']
            }));
            if (!currentJobStatus?.[0] || currentJobStatus[0].status === 's') break;

            const currentCity = targetLocations[cityIndex];
            if (!currentCity) break;

            // SECTION START: Select best key if not pagination-bound
            if (!pageToken) {
                activeKeys = activeKeys.filter(k => k.status !== 'error' && (k.usageToday || 0) < (k.usageLimit || 300));
                if (activeKeys.length === 0) {
                    await addLog(job.id, "❌ Všetky kľúče vyčerpané alebo v chybe.");
                    break;
                }
                // Picking the key with absolute minimum usage to be fair
                currentKey = activeKeys.sort((a, b) => (a.usageToday || 0) - (b.usageToday || 0))[0];
                console.log(`[DEBUG] Selected key for new section: ${currentKey.label} (Used today: ${currentKey.usageToday})`);
            }

            let callsInThisSection = 0;
            try {
                // A. Search Call
                const query = `${job.search_term} in ${currentCity}`;
                if (!pageToken) await addLog(job.id, `🔍 "${job.search_term}" v ${currentCity} (${currentKey.label})`);

                const searchResult: any = await searchBusinesses(currentKey.key, query, pageToken);
                callsInThisSection++;
                totalCallsThisBatch++;

                if (!searchResult.results?.length) {
                    cityIndex++;
                    pageToken = undefined;
                    // End of city, sync key usage
                    await syncKeyUsage(currentKey, callsInThisSection);
                    continue;
                }

                // B. Batch Process Details
                console.log(`[DEBUG] Processing ${searchResult.results.length} results for ${currentCity}...`);
                
                for (const rawPlace of searchResult.results) {
                    if (totalFound >= job.limit || foundThisRun >= limitPerRun || (Date.now() - startTime) >= MAX_RUNTIME) {
                        console.log(`[DEBUG] Breaking results loop: Found=${totalFound}/${job.limit}, ThisRun=${foundThisRun}/${limitPerRun}, Time=${Date.now()-startTime}ms`);
                        break;
                    }

                    // Optimization: Check if Title + City already exists to avoid Details call
                    // This isn't perfect but saves $ and time.
                    const quickCheck: any[] = await directus.request(readItems(LEADS_COLLECTION, {
                        filter: { 
                            _and: [
                                { title: { _eq: rawPlace.name } },
                                { source_city: { _eq: currentCity } }
                            ]
                        },
                        limit: 1, fields: ['id']
                    }));

                    if (quickCheck?.length > 0) {
                        console.log(`[DEBUG] Skipping known duplicate by title/city: ${rawPlace.name}`);
                        continue; 
                    }

                    const details: any = await getPlaceDetails(currentKey.key, rawPlace.place_id);
                    callsInThisSection++;
                    totalCallsThisBatch++;

                    if (details) {
                        const hasWebsite = !!details.website;
                        const newLead: any = {
                            title: details.name,
                            website: details.website,
                            phone: details.formatted_phone_number || details.international_phone_number,
                            city: details.formatted_address || currentCity,
                            google_maps_url: details.url,
                            google_maps_job_id: job.id,
                            source_city: currentCity,
                            status: 'lead',
                            user_email: job.owner_email,
                            list_name: hasWebsite ? (job.target_list || "Všeobecné") : 'Cold Call',
                            enrichment_status: hasWebsite ? 'pending' : null
                        };

                        // Final duplicate check by URL
                        const existing: any[] = await directus.request(readItems(LEADS_COLLECTION, {
                            filter: { google_maps_url: { _eq: details.url } },
                            limit: 1, fields: ['id']
                        }));

                        if (existing?.length === 0) {
                            await directus.request(createItem(LEADS_COLLECTION, newLead));
                            totalFound++;
                            foundThisRun++;
                            if (totalFound % 5 === 0) {
                                await directus.request(updateItem(JOBS_COLLECTION, job.id, { found_count: totalFound }));
                                await addLog(job.id, `💾 Priebežný stav: ${totalFound} leadov...`);
                            }
                        } else {
                            console.log(`[DEBUG] Skipping duplicate by URL: ${details.url}`);
                        }
                    } else {
                        console.warn(`[DEBUG] Failed to fetch details for ${rawPlace.place_id}`);
                    }
                }

                // SECTION END: Sync Key Usage once per page (up to 21 calls)
                await syncKeyUsage(currentKey, callsInThisSection);

                // C. Pagination handling
                if (searchResult.next_page_token && totalFound < job.limit) {
                    pageToken = searchResult.next_page_token;
                    // Google requires a short delay before the token becomes valid
                    await new Promise(r => setTimeout(r, 1500));
                } else {
                    cityIndex++;
                    pageToken = undefined;
                }

            } catch (err: any) {
                await addLog(job.id, `⚠️ Sekcia zlyhala: ${err.message}`);
                // Still sync usage if we did some calls before failing
                if (callsInThisSection > 0) await syncKeyUsage(currentKey, callsInThisSection);
                
                keysFailures[currentKey.id] = (keysFailures[currentKey.id] || 0) + 1;
                if (keysFailures[currentKey.id] >= 2) {
                    currentKey.status = 'error';
                    currentKey.errorMessage = err.message;
                    await syncKeyUsage(currentKey, 0);
                }
                break; 
            }
        }

        // 5. Finalize
        const isFinished = totalFound >= job.limit;
        const isCancelled = (await directus.request(readItems(JOBS_COLLECTION, { filter: { id: { _eq: job.id } }, fields: ['status'] })) as any)?.[0]?.status === 's';
        
        const nextStatus = isFinished ? 'd' : (isCancelled ? 's' : 'r');
        
        await directus.request(updateItem(JOBS_COLLECTION, job.id, {
            status: nextStatus,
            found_count: totalFound,
            current_city_index: cityIndex,
            next_page_token: pageToken || null
        }));

        await addLog(job.id, `📊 Súhrn várky: +${foundThisRun} leadov. Celkom ${totalFound}. (${totalCallsThisBatch} requestov zaznamenaných).`);
        
        // Final usage sync if loop ended abruptly
        if (foundThisRun === 0 && !isFinished && !isCancelled) {
             console.log("[DEBUG] Found 0 leads this run (all duplicates?), but continuing chain...");
        }

        const baseUrl = `${request.headers.get("x-forwarded-proto") || "https"}://${request.headers.get("host") || "crm.arcigy.cloud"}`;
        
        // Enrichment trigger
        fetch(`${baseUrl}/api/cron/enrich-leads`).catch(() => {});

        // Continuation trigger
        // IMPORTANT: Chain should continue ONLY if we are not finished AND not cancelled.
        // Even if foundThisRun is 0, we might have just hit a patch of duplicates and need to check the next city.
        const canContinue = !isFinished && !isCancelled && cityIndex < targetLocations.length;

        if (canContinue) {
            console.log(`[DEBUG] Chaining worker. Next city index: ${cityIndex}`);
            setTimeout(() => fetch(`${baseUrl}/api/cron/google-maps-worker`).catch(() => {}), 1000);
        }

        return NextResponse.json({ success: true, status: nextStatus, total_found: totalFound });

    } catch (error: any) {
        console.error("[GMAP WORKER] FATAL ERROR:", error);
        if (currentJobId) {
            await directus.request(updateItem(JOBS_COLLECTION, currentJobId, { 
                status: 'p',
                last_error: `Fatálna chyba: ${error.message}`
            }));
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
