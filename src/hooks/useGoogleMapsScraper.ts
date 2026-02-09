import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { searchBusinesses, getPlaceDetails } from '@/app/actions/google-maps';
import { updateApiKeyUsage } from '@/app/actions/google-maps-keys';
import { createScrapeJob, updateScrapeJob, getScrapeJobs, ScrapeJob } from '@/app/actions/google-maps-jobs';
import { bulkCreateColdLeads } from '@/app/actions/cold-leads';
import { SLOVAKIA_CITIES, CITY_COORDINATES } from '@/tools/google-maps/constants';
import { ApiKey } from '@/tools/google-maps/ApiKeyManager';
import { ScrapedPlace } from '@/types/google-maps';

export function useGoogleMapsScraper(keys: ApiKey[], setKeys: React.Dispatch<React.SetStateAction<ApiKey[]>>) {
    const [isScraping, setIsScraping] = useState(false);
    const [places, setPlaces] = useState<ScrapedPlace[]>([]);
    const [logs, setLogs] = useState<string[]>([]);
    const [queue, setQueue] = useState<ScrapeJob[]>([]);
    const isScrapingRef = useRef(false);
    const currentJobIdRef = useRef<string | null>(null);
    const unsavedPlacesRef = useRef<ScrapedPlace[]>([]);

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
        
        // Final save for any remaining unsaved leads
        if (unsavedPlacesRef.current.length > 0) {
            await autoSaveLeads(unsavedPlacesRef.current);
            unsavedPlacesRef.current = [];
        }

        loadQueue();
    }, [addLog, places.length, loadQueue]);

    const autoSaveLeads = async (leads: ScrapedPlace[], searchTerm: string = "Google Maps", location: string = "Slovakia") => {
        if (leads.length === 0) return;
        
        const leadsToCreate = leads.map(p => ({
            title: p.name,
            company_name_reworked: p.name,
            website: p.website,
            phone: p.phone,
            city: p.source_city || location,
            google_maps_url: p.url,
            source_keyword: searchTerm,
            source_city: p.source_city || location,
            list_name: `GMap Scrape - ${searchTerm} - ${new Date().toLocaleDateString()}`
        }));

        try {
            await bulkCreateColdLeads(leadsToCreate);
            addLog(`💾 Automaticky uložených ${leads.length} leadov do databázy.`);
        } catch (e) {
            console.error("Auto-save failed", e);
            addLog("❌ Automatické ukladanie zlyhalo.");
        }
    };

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
        const normalizedStart = startLocation.trim();
        const startCoords = CITY_COORDINATES[normalizedStart];
        if (!startCoords) return [normalizedStart];
        return Object.keys(CITY_COORDINATES)
            .sort((a, b) => {
                const distA = getDistance(startCoords.lat, startCoords.lng, CITY_COORDINATES[a].lat, CITY_COORDINATES[a].lng);
                const distB = getDistance(startCoords.lat, startCoords.lng, CITY_COORDINATES[b].lat, CITY_COORDINATES[b].lng);
                return distA - distB;
            });
    };

    const runScraper = async (searchTerm: string, location: string, limit: number, existingJobId?: string) => {
        if (!searchTerm || !location) {
            toast.error("Zadajte kľúčové slovo a lokalitu.");
            return;
        }

        let targetLocations = (location.trim().toLowerCase().includes('slovensko')) ? SLOVAKIA_CITIES : getOrderedLocations(location);
        
        setIsScraping(true);
        isScrapingRef.current = true;
        setLogs([]);
        setPlaces([]);
        unsavedPlacesRef.current = [];

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
            if (currentJobIdRef.current) await updateScrapeJob(currentJobIdRef.current, { status: 'paused' });
            return;
        }
        availableKeys.sort((a, b) => a.usageMonth - b.usageMonth);
        
        let totalFound = 0;
        
        try {
            for (const currentCity of targetLocations) {
                if (!isScrapingRef.current || totalFound >= limit) break;
                addLog(`📍 Hľadám v: ${currentCity} (${totalFound}/${limit})`);

                let pageToken: string | undefined = undefined;
                while (isScrapingRef.current && totalFound < limit) {
                    const currentKey = availableKeys.find(k => (k.usageToday || 0) < 300);
                    if (!currentKey) {
                        addLog("⏸️ Všetky kľúče na limite. Ukladám do Queue (Queue A).");
                        if (currentJobIdRef.current) await updateScrapeJob(currentJobIdRef.current, { status: 'paused', found_count: totalFound });
                        isScrapingRef.current = false;
                        break;
                    }

                    try {
                        const query = `${searchTerm} in ${currentCity}`;
                        currentKey.usageToday = (currentKey.usageToday || 0) + 1;
                        updateApiKeyUsage(currentKey.id, { usageToday: currentKey.usageToday, lastUsed: new Date().toISOString() });
                        
                        const searchResult: any = await searchBusinesses(currentKey.key, query, pageToken);
                        if (!searchResult.results?.length) break;

                        for (const rawPlace of searchResult.results) {
                            if (totalFound >= limit || !isScrapingRef.current) break;
                            if ((currentKey.usageToday || 0) >= 300) break;

                            currentKey.usageToday = (currentKey.usageToday || 0) + 1;
                            updateApiKeyUsage(currentKey.id, { usageToday: currentKey.usageToday, lastUsed: new Date().toISOString() });
                            
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
                                unsavedPlacesRef.current.push(newPlace);
                                totalFound++;

                                // Batch save every 10 leads
                                if (unsavedPlacesRef.current.length >= 10) {
                                    autoSaveLeads([...unsavedPlacesRef.current], searchTerm, location);
                                    unsavedPlacesRef.current = [];
                                }

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
                        if (availableKeys.length === 0) break;
                    }
                }
            }
        } catch (e) {
            console.error(e);
            addLog("💥 Fatálna chyba scrapera.");
        } finally {
            // Save remaining unsaved leads
            if (unsavedPlacesRef.current.length > 0) {
                await autoSaveLeads(unsavedPlacesRef.current, searchTerm, location);
                unsavedPlacesRef.current = [];
            }

            const finalStatus = totalFound >= limit ? 'completed' : (isScrapingRef.current ? 'processing' : (currentJobIdRef.current ? 'paused' : 'cancelled'));
            if (currentJobIdRef.current) {
                await updateScrapeJob(currentJobIdRef.current, { status: finalStatus as any, found_count: totalFound });
            }

            setIsScraping(false);
            isScrapingRef.current = false;
            addLog(`🏁 Hotovo. Nájdených ${totalFound} firiem.`);
            loadQueue();
        }
    };

    return { isScraping, places, logs, queue, runScraper, stopScraping, loadQueue };
}
