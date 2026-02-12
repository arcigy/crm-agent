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
    const syncKeyUsage = async (jobId: string, keyObj: any, callsDone: number) => {
        if (callsDone <= 0) return;
        try {
            keyObj.usageToday += callsDone;
            keyObj.usageMonth += callsDone;
            const isLimitReached = keyObj.usageToday >= (keyObj.usageLimit || 300);
            
            await addLog(jobId, `📝 Zapisujem ${callsDone} requestov kľúču ${keyObj.label}. Dnes celkom: ${keyObj.usageToday}`);
            
            await directus.request(updateItem('google_maps_keys', keyObj.id, { 
                usage_today: keyObj.usageToday, 
                usage_month: keyObj.usageMonth,
                last_used: new Date().toISOString(),
                status: isLimitReached ? 'limit_reached' : (keyObj.status === 'error' ? 'error' : 'active'),
                error_message: keyObj.errorMessage || ''
            }));
            return true;
        } catch (e: any) {
            console.error(`[CRITICAL] Failed to sync usage for key ${keyObj.label}:`, e);
            await addLog(jobId, `⚠️ Nepodarilo sa zapísať využitie kľúča: ${e.message}`);
            return false;
        }
    };
    
    try {
        console.log("--- [GMAP WORKER] Starting Optimized Background Scraper ---");
        
        // 1. Fetch active jobs
        const jobs = await directus.request(readItems(JOBS_COLLECTION, {
            filter: { status: { _in: ['w', 'p', 'r'] } }, // Include 'r' to catch stuck jobs if any
            limit: 1,
            sort: ['date_created']
        }));

        if (!jobs || jobs.length === 0) return NextResponse.json({ message: "No jobs to process." });

        const job = jobs[0] as any;
        currentJobId = job.id;
        jobLogs = job.logs ? job.logs.split('\n') : [];
        totalFound = job.found_count || 0;

        // Skip if already finished
        if (totalFound >= job.limit) {
            await directus.request(updateItem(JOBS_COLLECTION, job.id, { status: 'd' }));
            return NextResponse.json({ message: "Job already finished." });
        }

        await directus.request(updateItem(JOBS_COLLECTION, job.id, { status: 'r', last_error: null }));
        if (job.status !== 'r') await addLog(job.id, "🚀 Štartujem optimalizovaný scraper...");

        // 2. Fetch Keys
        const keys = await getSystemApiKeys();
        let activeKeys = keys.filter(k => (k.usageToday || 0) < (k.usageLimit || 300) && k.status !== 'error');

        if (activeKeys.length === 0) {
            const errorMsg = "Limit dosiahnutý: Všetky kľúče vyčerpané.";
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
        
        const limitPerRun = 50; // Smaller batches for better responsiveness
        const startTime = Date.now();
        const MAX_RUNTIME = 35000; // 35s to allow for a safe exit and sync

        // 4. Execution Loop (Paged Sections)
        let duplicatesInARow = 0;

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
                if (activeKeys.length === 0) break;
                currentKey = activeKeys.sort((a, b) => (a.usageToday || 0) - (b.usageToday || 0))[0];
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
                    await syncKeyUsage(job.id, currentKey, callsInThisSection);
                    continue;
                }

                // B. Batch Process Details
                let newInThisPage = 0;
                for (const rawPlace of searchResult.results) {
                    if (totalFound >= job.limit || foundThisRun >= limitPerRun || (Date.now() - startTime) >= MAX_RUNTIME) break;

                    // Quick Deduplication Check (Title + City)
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
                        duplicatesInARow++;
                        continue; 
                    }

                    // Detail call (Billable)
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

                        // Duplicate check by URL
                        const existing: any[] = await directus.request(readItems(LEADS_COLLECTION, {
                            filter: { google_maps_url: { _eq: details.url } },
                            limit: 1, fields: ['id']
                        }));

                        if (existing?.length === 0) {
                            await directus.request(createItem(LEADS_COLLECTION, newLead));
                            totalFound++;
                            foundThisRun++;
                            newInThisPage++;
                            duplicatesInARow = 0;
                            if (totalFound % 5 === 0) {
                                await directus.request(updateItem(JOBS_COLLECTION, job.id, { found_count: totalFound }));
                            }
                        } else {
                            duplicatesInARow++;
                        }
                    }
                }

                if (newInThisPage > 0) {
                    await addLog(job.id, `💾 Stránka dokončená: +${newInThisPage} nových leadov.`);
                } else if (searchResult.results.length > 0) {
                    await addLog(job.id, `⏭️ Stránka preskočená (iba duplikáty).`);
                }

                // SECTION END: Sync Key Usage once per page
                await syncKeyUsage(job.id, currentKey, callsInThisSection);

                // C. Pagination handling
                if (searchResult.next_page_token && totalFound < job.limit) {
                    pageToken = searchResult.next_page_token;
                    await new Promise(r => setTimeout(r, 1500));
                } else {
                    cityIndex++;
                    pageToken = undefined;
                }

            } catch (err: any) {
                await addLog(job.id, `⚠️ Sekcia zlyhala: ${err.message}`);
                if (callsInThisSection > 0) await syncKeyUsage(job.id, currentKey, callsInThisSection);
                
                keysFailures[currentKey.id] = (keysFailures[currentKey.id] || 0) + 1;
                if (keysFailures[currentKey.id] >= 2) {
                    currentKey.status = 'error';
                    currentKey.errorMessage = err.message;
                    await syncKeyUsage(job.id, currentKey, 0);
                }
                break; 
            }
        }

        // 5. Finalize
        const isFinished = totalFound >= job.limit;
        const isCancelled = (await directus.request(readItems(JOBS_COLLECTION, { filter: { id: { _eq: job.id } }, fields: ['status'] })) as any)?.[0]?.status === 's';
        
        const nextStatus = isFinished ? 'd' : (isCancelled ? 's' : 'p'); // Using 'p' (pending) for chain triggers
        
        await directus.request(updateItem(JOBS_COLLECTION, job.id, {
            status: nextStatus,
            found_count: totalFound,
            current_city_index: cityIndex,
            next_page_token: pageToken || null,
            last_error: null
        }));

        await addLog(job.id, `📊 Súhrn várky: +${foundThisRun} leadov. Celkom ${totalFound}. (${totalCallsThisBatch} Google requestov).`);
        if (isFinished) await addLog(job.id, "🏁 Úloha úspešne dokončená.");

        // Trigger chain or enrichment
        const baseUrl = `${request.headers.get("x-forwarded-proto") || "https"}://${request.headers.get("host") || "crm.arcigy.cloud"}`;
        
        // Enrichment trigger
        fetch(`${baseUrl}/api/cron/enrich-leads`).catch(() => {});

        // Continuation trigger
        if (!isFinished && !isCancelled && cityIndex < targetLocations.length) {
            console.log(`[DEBUG] Chaining worker to city index: ${cityIndex}`);
            // Use a short delay but don't await
            setTimeout(() => {
                fetch(`${baseUrl}/api/cron/google-maps-worker`).catch(e => console.error("Chain trigger failed:", e));
            }, 2000);
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
