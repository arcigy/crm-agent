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
        // Only keep last 50 logs to avoid DB bloat
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
        jobLogs = job.logs ? job.logs.split('\n') : [];

        console.log(`[GMAP WORKER] Processing Job: ${job.id} | Term: "${job.search_term}" | Loc: ${job.location}`);

        // Update status to processing immediately to show activity
        if (job.status === 'queued') {
            await directus.request(updateItem(JOBS_COLLECTION, job.id, { status: 'processing', last_error: null }));
            await addLog(job.id, "🚀 Štartujem novú úlohu...");
        }

        // 2. Fetch Keys
        console.log("[GMAP WORKER] Fetching API keys...");
        const keys = await getSystemApiKeys();
        const activeKeys = keys.filter(k => (k.usageToday || 0) < (k.usageLimit || 300));

        console.log(`[GMAP WORKER] Found ${activeKeys.length} active keys out of ${keys.length} total.`);

        if (activeKeys.length === 0) {
            console.warn("[GMAP WORKER] ABORT: No available API keys.");
            const errorMsg = "Limit dosiahnutý: Žiadne dostupné Google API kľúče s voľným limitom.";
            await directus.request(updateItem(JOBS_COLLECTION, job.id, { 
                status: 'paused', 
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
        const limitPerRun = 10; 

        console.log(`[GMAP WORKER] Iteration Start: CityIndex ${cityIndex}, TotalFound ${totalFound}, PageToken: ${pageToken ? 'YES' : 'NO'}`);

        // 4. Execution Loop
        const startTime = Date.now();
        const MAX_RUNTIME = 45000; // Increased runtime for better throughput

        while (totalFound < job.limit && (Date.now() - startTime) < MAX_RUNTIME && foundThisRun < limitPerRun) {
            const currentCity = targetLocations[cityIndex];
            if (!currentCity) {
                await addLog(job.id, "✅ Žiadne ďalšie mestá v zozname. Dokončené.");
                break;
            }

            const currentKey = activeKeys.find(k => (k.usageToday || 0) < (k.usageLimit || 300));
            if (!currentKey) {
                await addLog(job.id, "⚠️ Všetky kľúče vyčerpané počas behu.");
                break;
            }

            try {
                // Search Businesses
                const query = `${job.search_term} in ${currentCity}`;
                await addLog(job.id, `🔍 Hľadám "${job.search_term}" v ${currentCity} (Kľúč: ${currentKey.label})`);
                
                const searchResult: any = await searchBusinesses(currentKey.key, query, pageToken);

                // Update key usage immediately after call
                currentKey.usageToday = (currentKey.usageToday || 0) + 1;
                await updateApiKeyUsage(currentKey.id, { usageToday: currentKey.usageToday, lastUsed: new Date().toISOString() });

                if (!searchResult.results?.length) {
                    await addLog(job.id, `ℹ️ V ${currentCity} sa nič nenašlo. Skáčem na ďalšie mesto.`);
                    cityIndex++;
                    pageToken = undefined;
                    continue;
                }

                // Process Individual Results
                for (const rawPlace of searchResult.results) {
                    if (totalFound >= job.limit || foundThisRun >= limitPerRun) break;
                    
                    // Increment usage for details call
                    currentKey.usageToday = (currentKey.usageToday || 0) + 1;
                    await updateApiKeyUsage(currentKey.id, { usageToday: currentKey.usageToday, lastUsed: new Date().toISOString() });
                    
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
                        await addLog(job.id, `💾 Uložené: ${newLead.title} ${hasWebsite ? '(Web ✅)' : '(Bez webu -> Cold Call)'}`);

                        totalFound++;
                        foundThisRun++;
                        if (hasWebsite) leadsWithWebsites++;

                        // Update progress in job immediately
                        await directus.request(updateItem(JOBS_COLLECTION, job.id, {
                            found_count: totalFound
                        }));
                    }
                }

                // Prepare next page or next city
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

        // 5. Final Batch State Sync
        const isFinished = totalFound >= job.limit;
        const nextStatus = isFinished ? 'completed' : 'processing';
        
        await directus.request(updateItem(JOBS_COLLECTION, job.id, {
            status: nextStatus,
            found_count: totalFound,
            current_city_index: cityIndex,
            next_page_token: pageToken || null,
            last_error: null
        }));

        if (isFinished) await addLog(job.id, "🏁 Úloha úspešne dokončená.");

        // 6. Turbo Pings (Self-recursion & Enrichment)
        const proto = request.headers.get("x-forwarded-proto") || "http";
        const host = request.headers.get("host");
        const baseUrl = `${proto}://${host}`;

        // Ping enrichment worker if we added leads with websites
        if (leadsWithWebsites > 0) {
            console.log("[GMAP WORKER] Pinging enrichment worker...");
            fetch(`${baseUrl}/api/cron/enrich-leads`, { headers: { 'Cache-Control': 'no-cache' }}).catch(() => {});
        }

        if (!isFinished && foundThisRun > 0) {
            console.log("[GMAP WORKER] Sending self-ping for next batch...");
            const nextUrl = `${baseUrl}/api/cron/google-maps-worker`;
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
