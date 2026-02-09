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
    let jobLogs: string[] = [];

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
    
    try {
        console.log("--- [GMAP WORKER] Starting Background Check ---");
        
        // 1. Fetch active jobs with locking logic
        // We pick jobs that are:
        // - queued/paused
        // - OR processing but haven't been updated for > 2 minutes (stale)
        const twoMinutesAgo = new Date(Date.now() - 2 * 60000).toISOString();
        
        const jobs = await directus.request(readItems(JOBS_COLLECTION, {
            filter: {
                status: { _in: ['w', 'p'] }
            },
            limit: 1,
            sort: ['date_created']
        }));

        if (!jobs || jobs.length === 0) {
            console.log("[GMAP WORKER] No active or stale jobs found.");
            return NextResponse.json({ message: "No jobs to process." });
        }

        const job = jobs[0] as any;
        currentJobId = job.id;
        jobLogs = job.logs ? job.logs.split('\n') : [];

        console.log(`[GMAP WORKER] Picking Job: ${job.id} | Status: ${job.status}`);

        // Update status to processing and set date_updated to "lock" the job
        await directus.request(updateItem(JOBS_COLLECTION, job.id, { 
            status: 'r', 
            last_error: null
        }));

        if (job.status !== 'r') {
            await addLog(job.id, "🚀 Štartujem alebo obnovujem úlohu...");
        }

        // 2. Fetch Keys
        const keys = await getSystemApiKeys();
        const activeKeys = keys.filter(k => (k.usageToday || 0) < (k.usageLimit || 300));

        if (activeKeys.length === 0) {
            const errorMsg = "Limit dosiahnutý: Žiadne dostupné kľúče.";
            await directus.request(updateItem(JOBS_COLLECTION, job.id, { 
                status: 'p', 
                last_error: errorMsg
            }));
            await addLog(job.id, `❌ ${errorMsg}`);
            return NextResponse.json({ message: "No available API keys." });
        }

        // 3. Setup Iteration
        const normalizedLoc = job.location.toLowerCase();
        const targetLocations = (normalizedLoc.includes('slovensko') || normalizedLoc === 'sk') ? SLOVAKIA_CITIES : getOrderedLocations(job.location);
        
        let cityIndex = job.current_city_index || 0;
        let pageToken = job.next_page_token || undefined;
        let totalFound = job.found_count || 0;
        let foundThisRun = 0;
        let leadsWithWebsites = 0;
        const limitPerRun = 100; 

        // 4. Execution Loop
        const startTime = Date.now();
        const MAX_RUNTIME = 50000; 

        while (totalFound < job.limit && (Date.now() - startTime) < MAX_RUNTIME && foundThisRun < limitPerRun) {
            // Heartbeat: Check if job was cancelled by user
            const currentJobStatus: any = await directus.request(readItems(JOBS_COLLECTION, {
                filter: { id: { _eq: job.id } },
                fields: ['status']
            }));
            
            if (!currentJobStatus?.[0] || currentJobStatus[0].status === 's') {
                console.log("[GMAP WORKER] Job cancelled during loop.");
                return NextResponse.json({ message: "Job cancelled." });
            }

            const currentCity = targetLocations[cityIndex];
            if (!currentCity) {
                await addLog(job.id, "✅ Koniec zoznamu miest.");
                break;
            }

            // Dynamic key selection: Always pick the one with lowest current usage
            const currentKey = activeKeys
                .filter(k => (k.usageToday || 0) < (k.usageLimit || 300))
                .sort((a, b) => (a.usageToday || 0) - (b.usageToday || 0))[0];

            if (!currentKey) {
                await addLog(job.id, "⚠️ Všetky kľúče vyčerpané.");
                break;
            }

            try {
                // Keep-alive skipped (date_updated missing)

                // Search Businesses
                const query = `${job.search_term} in ${currentCity}`;
                await addLog(job.id, `🔍 "${job.search_term}" -> ${currentCity} (${currentKey.label}: ${currentKey.usageToday}/${currentKey.usageLimit || 300})`);
                
                const searchResult: any = await searchBusinesses(currentKey.key, query, pageToken);

                // CRITICAL: Update usage in DB immediately
                currentKey.usageToday = (currentKey.usageToday || 0) + 1;
                currentKey.usageMonth = (currentKey.usageMonth || 0) + 1;
                const isLimitReached = currentKey.usageToday >= (currentKey.usageLimit || 300);
                
                await directus.request(updateItem('google_maps_keys', currentKey.id, { 
                    usage_today: currentKey.usageToday, 
                    usage_month: currentKey.usageMonth,
                    last_used: new Date().toISOString(),
                    status: isLimitReached ? 'limit_reached' : 'active'
                }));

                if (isLimitReached) {
                    await addLog(job.id, `⚠️ Kľúč ${currentKey.label} vyčerpal limit.`);
                }

                if (!searchResult.results?.length) {
                    await addLog(job.id, `ℹ️ Žiadne výsledky v ${currentCity}.`);
                    cityIndex++;
                    pageToken = undefined;
                    continue;
                }

                // Process Individual Results
                for (const rawPlace of searchResult.results) {
                    if (totalFound >= job.limit || foundThisRun >= limitPerRun) break;
                    
                    // Increment usage for details call
                    currentKey.usageToday = (currentKey.usageToday || 0) + 1;
                    currentKey.usageMonth = (currentKey.usageMonth || 0) + 1;
                    await directus.request(updateItem('google_maps_keys', currentKey.id, { 
                        usage_today: currentKey.usageToday,
                        usage_month: currentKey.usageMonth,
                        last_used: new Date().toISOString()
                    }));
                    
                    const details: any = await getPlaceDetails(currentKey.key, rawPlace.place_id);
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
                            list_name: hasWebsite ? (job.target_list || job.search_term) : 'Cold Call',
                            enrichment_status: hasWebsite ? 'pending' : null
                        };

                        await directus.request(createItem(LEADS_COLLECTION, newLead));
                        await addLog(job.id, `💾 ${newLead.title} ${hasWebsite ? '✅' : '❌'}`);

                        totalFound++;
                        foundThisRun++;
                        if (hasWebsite) leadsWithWebsites++;

                        await directus.request(updateItem(JOBS_COLLECTION, job.id, {
                            found_count: totalFound
                        }));
                    }
                }

                if (searchResult.next_page_token && totalFound < job.limit) {
                    pageToken = searchResult.next_page_token;
                    await new Promise(r => setTimeout(r, 2000));
                } else {
                    cityIndex++;
                    pageToken = undefined;
                }

            } catch (loopErr: any) {
                console.error("[GMAP WORKER] Loop Error:", loopErr.message);
                await addLog(job.id, `❌ Chyba: ${loopErr.message}`);
                break;
            }
        }

        const isFinished = totalFound >= job.limit;
        const nextStatus = isFinished ? 'd' : 'r';
        
        await directus.request(updateItem(JOBS_COLLECTION, job.id, {
            status: nextStatus,
            found_count: totalFound,
            current_city_index: cityIndex,
            next_page_token: pageToken || null,
            last_error: null
        }));

        if (isFinished) await addLog(job.id, "🏁 Hotovo.");

        const proto = request.headers.get("x-forwarded-proto") || "http";
        const host = request.headers.get("host");
        const baseUrl = `${proto}://${host}`;

        if (leadsWithWebsites > 0) {
            fetch(`${baseUrl}/api/cron/enrich-leads`, { headers: { 'Cache-Control': 'no-cache' }}).catch(() => {});
        }

        if (!isFinished && foundThisRun > 0) {
            const nextUrl = `${baseUrl}/api/cron/google-maps-worker`;
            fetch(nextUrl, { headers: { 'Cache-Control': 'no-cache' }}).catch(() => {});
        }

        return NextResponse.json({ success: true, status: nextStatus, total_found: totalFound, processed_this_run: foundThisRun });

    } catch (error: any) {
        console.error("[GMAP WORKER] FATAL ERROR:", error);
        if (currentJobId) {
            await directus.request(updateItem(JOBS_COLLECTION, currentJobId, { 
                last_error: `Fatálna chyba: ${error.message}`
            }));
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
