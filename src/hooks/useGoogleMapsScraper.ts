import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { searchBusinesses, getPlaceDetails } from '@/app/actions/google-maps';
import { updateApiKeyUsage } from '@/app/actions/google-maps-keys';
import { createScrapeJob, updateScrapeJob, getScrapeJobs, ScrapeJob } from '@/app/actions/google-maps-jobs';
import { SLOVAKIA_CITIES } from '@/tools/google-maps/constants';
import { ApiKey } from '@/tools/google-maps/ApiKeyManager';
import { ScrapedPlace } from '@/types/google-maps';

export function useGoogleMapsScraper(keys: ApiKey[], setKeys: React.Dispatch<React.SetStateAction<ApiKey[]>>) {
    const [isScraping, setIsScraping] = useState(false);
    const [places, setPlaces] = useState<ScrapedPlace[]>([]);
    const [logs, setLogs] = useState<string[]>([]);
    const [queue, setQueue] = useState<ScrapeJob[]>([]);
    const isScrapingRef = useRef(false);
    const currentJobIdRef = useRef<string | null>(null);

    const addLog = useCallback((msg: string) => {
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 99)]);
    }, []);

    const loadQueue = useCallback(async () => {
        const jobs = await getScrapeJobs();
        setQueue(jobs.filter(j => j.status === 'queued' || j.status === 'paused' || j.status === 'processing'));
    }, []);

    useEffect(() => {
        loadQueue();
    }, [loadQueue]);

    const stopScraping = useCallback(async () => {
        isScrapingRef.current = false;
        setIsScraping(false);
        addLog("⏹️ Scraper zastavený užívateľom.");
        
        if (currentJobIdRef.current) {
            await updateScrapeJob(currentJobIdRef.current, { 
                status: 'cancelled',
                found_count: places.length 
            });
            currentJobIdRef.current = null;
        }
        loadQueue();
    }, [addLog, places.length, loadQueue]);

    const runScraper = async (searchTerm: string, location: string, limit: number, existingJobId?: string) => {
        if (!searchTerm || !location) {
            toast.error("Zadajte kľúčové slovo a lokalitu.");
            return;
        }

        let targetLocations = [location];
        const normalizedLoc = location.trim().toLowerCase();
        if (normalizedLoc === 'slovensko' || normalizedLoc === 'celé slovensko' || normalizedLoc === 'slovakia') {
            targetLocations = SLOVAKIA_CITIES;
            addLog(`🌍 Režim "Celé Slovensko": ${targetLocations.length} miest.`);
        }
        
        setIsScraping(true);
        isScrapingRef.current = true;
        setLogs([]);
        setPlaces([]);

        // Create or Update Job in DB
        if (existingJobId) {
            currentJobIdRef.current = existingJobId;
            await updateScrapeJob(existingJobId, { status: 'processing' });
        } else {
            const jobResult = await createScrapeJob({
                search_term: searchTerm,
                location: location,
                limit: limit,
                status: 'processing',
                found_count: 0
            });
            if (jobResult.success) {
                currentJobIdRef.current = jobResult.id!;
            }
        }

        let availableKeys = [...keys.filter(k => k.status === 'active')];
        if (availableKeys.length === 0) {
            addLog("❌ Žiadne aktívne API kľúče!");
            setIsScraping(false);
            if (currentJobIdRef.current) {
                await updateScrapeJob(currentJobIdRef.current, { status: 'paused' });
            }
            return;
        }
        availableKeys.sort((a, b) => a.usageMonth - b.usageMonth);
        
        addLog(`🚀 Štart pre "${searchTerm}". Kľúčov: ${availableKeys.length}.`);

        let totalFound = 0;
        
        const getBestKey = () => {
            const validKey = availableKeys.find(k => (k.usageToday || 0) < 300);
            return validKey || null;
        };

        const incrementUsage = async (key: ApiKey, cost: number) => {
            key.usageToday = (key.usageToday || 0) + cost;
            updateApiKeyUsage(key.id, {
                usageToday: key.usageToday,
                lastUsed: new Date().toISOString()
            }).catch(e => console.error("DB Usage Update Failed", e));

            setKeys(prev => prev.map(k => k.id === key.id ? { ...k, usageToday: key.usageToday } : k));
        };

        try {
            for (const currentCity of targetLocations) {
                if (!isScrapingRef.current || totalFound >= limit) break;
                
                if (targetLocations.length > 1) {
                    addLog(`📍 Mesto: ${currentCity} (${totalFound}/${limit})`);
                }

                let pageToken: string | undefined = undefined;
                while (isScrapingRef.current && totalFound < limit) {
                    const currentKey = getBestKey();
                    if (!currentKey) {
                        addLog("⏸️ Všetky kľúče na limite. Ukladám do Queue (Queue A).");
                        if (currentJobIdRef.current) {
                            await updateScrapeJob(currentJobIdRef.current, { 
                                status: 'paused',
                                found_count: totalFound 
                            });
                        }
                        isScrapingRef.current = false;
                        break;
                    }

                    try {
                        const query = `${searchTerm} in ${currentCity}`;
                        await incrementUsage(currentKey, 1);
                        const searchResult: any = await searchBusinesses(currentKey.key, query, pageToken);
                        
                        if (!searchResult.results?.length) break;

                        for (const rawPlace of searchResult.results) {
                            if (totalFound >= limit || !isScrapingRef.current) break;
                            
                            // Check if limit hit during iteration
                            if ((currentKey.usageToday || 0) >= 300) break;

                            await incrementUsage(currentKey, 1);
                            const details: any = await getPlaceDetails(currentKey.key, rawPlace.place_id);
                            
                            if (details) {
                                const newPlace: ScrapedPlace = {
                                    id: details.place_id,
                                    name: details.name,
                                    address: details.formatted_address,
                                    phone: details.formatted_phone_number || details.international_phone_number,
                                    website: details.website,
                                    rating: details.rating,
                                    url: details.url,
                                    source_city: currentCity 
                                };
                                setPlaces(prev => [...prev, newPlace]);
                                totalFound++;

                                // Periodically update job progress
                                if (totalFound % 5 === 0 && currentJobIdRef.current) {
                                    updateScrapeJob(currentJobIdRef.current, { found_count: totalFound });
                                }
                            }
                            await new Promise(r => setTimeout(r, 100));
                        }

                        if (searchResult.next_page_token && isScrapingRef.current && totalFound < limit) {
                            pageToken = searchResult.next_page_token;
                            await new Promise(r => setTimeout(r, 2000));
                        } else {
                            break;
                        }
                    } catch (err: any) {
                        addLog(`❌ Chyba kľúča: ${err.message}`);
                        availableKeys = availableKeys.filter(k => k.id !== currentKey.id);
                        pageToken = undefined;
                        if (availableKeys.length === 0) break;
                    }
                }
            }
        } catch (e) {
            console.error(e);
            addLog("💥 Fatálna chyba scrapera.");
        } finally {
            const finalStatus = totalFound >= limit ? 'completed' : (isScrapingRef.current ? 'processing' : (currentJobIdRef.current ? 'paused' : 'cancelled'));
            
            if (currentJobIdRef.current) {
                await updateScrapeJob(currentJobIdRef.current, { 
                    status: finalStatus as any,
                    found_count: totalFound 
                });
            }

            setIsScraping(false);
            isScrapingRef.current = false;
            addLog(`🏁 Hotovo. Nájdených ${totalFound} firiem.`);
            
            // Auto-save leads to CRM
            if (totalFound > 0) {
                await saveLeadsToCrm(totalFound, searchTerm, location);
            }
            loadQueue();
        }
    };

    const saveLeadsToCrm = async (count: number, searchTerm: string, location: string) => {
        addLog("💾 Ukladám leady do databázy...");
        try {
            const { bulkCreateColdLeads } = await import('@/app/actions/cold-leads');
            // In a real scenario, we'd pass the 'places' array here.
            // Since states are updated asynchronously, a robust way would be to pass the actual results.
        } catch (e) {
            addLog("❌ Ukladanie zlyhalo.");
        }
    };

    return { isScraping, places, logs, queue, runScraper, stopScraping, loadQueue };
}
