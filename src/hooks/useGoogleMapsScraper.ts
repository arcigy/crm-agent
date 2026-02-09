import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { getScrapeJobs, createScrapeJob, ScrapeJob, getJobLeads } from '@/app/actions/google-maps-jobs';
import { ApiKey } from '@/tools/google-maps/ApiKeyManager';
import { ScrapedPlace } from '@/types/google-maps';

export function useGoogleMapsScraper(keys?: ApiKey[], setKeys?: React.Dispatch<React.SetStateAction<ApiKey[]>>) {
    const [isScraping, setIsScraping] = useState(false);
    const [places, setPlaces] = useState<ScrapedPlace[]>([]);
    const [logs, setLogs] = useState<string[]>([]);
    const [queue, setQueue] = useState<ScrapeJob[]>([]);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastPlacesCountRef = useRef<number>(0);

    const addLog = useCallback((msg: string) => {
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 99)]);
    }, []);

    const loadQueue = useCallback(async () => {
        try {
            const jobs = await getScrapeJobs();
            setQueue(jobs.slice(0, 10));
            
            const activeJob = jobs.find(j => j.status === 'r' || j.status === 'w');
            setIsScraping(!!activeJob);

            // If we have a latest job and no results shown yet, load them!
            if (jobs.length > 0 && (places.length === 0 || lastPlacesCountRef.current === 0)) {
                const latestJob = jobs[0]; 
                const leads = await getJobLeads(latestJob.id);
                if (leads && leads.length > 0) {
                    const mappedLeads = (leads as any[]).map(l => ({
                        id: String(l.id),
                        name: l.title,
                        address: l.formatted_address || l.city,
                        phone: l.phone,
                        website: l.website,
                        url: l.google_maps_url,
                        source_city: l.source_city
                    }));
                    setPlaces(mappedLeads);
                    lastPlacesCountRef.current = mappedLeads.length;
                    addLog(`📍 Načítaných ${mappedLeads.length} výsledkov z poslednej úlohy.`);
                }
            }

            return jobs;
        } catch (e) {
            console.error("Load queue failed", e);
            return [];
        }
    }, [places.length, addLog]);

    const pollJobStatus = useCallback(async () => {
        const jobs = await loadQueue();
        const activeJob = jobs.find(j => j.status === 'r' || j.status === 'w');
        
        if (activeJob) {
            try {
                // Update logs from DB
                if (activeJob.logs) {
                    const serverLogs = activeJob.logs.split('\n');
                    setLogs(prev => {
                        // Merge server logs with local logs, filtering out duplicates
                        const combined = [...new Set([...serverLogs, ...prev])];
                        return combined.sort((a, b) => {
                            const timeA = a.match(/\[(.*?)\]/)?.[1] || "";
                            const timeB = b.match(/\[(.*?)\]/)?.[1] || "";
                            return timeB.localeCompare(timeA);
                        }).slice(0, 50);
                    });
                }

                const leads = await getJobLeads(activeJob.id);
                if (!leads) return;

                // Increased limit to see up to 500 leads in real-time
                const mappedLeads: ScrapedPlace[] = (leads as any[]).map(l => ({
                    id: String(l.id),
                    name: l.title,
                    address: l.formatted_address || l.city,
                    phone: l.phone,
                    website: l.website,
                    url: l.google_maps_url,
                    source_city: l.source_city
                }));

                // Update places only if count changed to avoid unnecessary re-renders
                if (mappedLeads.length !== lastPlacesCountRef.current) {
                    setPlaces(mappedLeads);
                    lastPlacesCountRef.current = mappedLeads.length;
                }
            } catch (e) {
                console.error("Polling leads failed", e);
            }
        } else {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
            setIsScraping(false);
            lastPlacesCountRef.current = 0;
        }
    }, [loadQueue]);

    useEffect(() => {
        loadQueue();
        // Faster polling (3s) for better real-time feel
        if (!pollIntervalRef.current) {
            pollIntervalRef.current = setInterval(pollJobStatus, 3000);
        }
        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
        };
    }, [loadQueue, pollJobStatus]);

    const runScraper = async (searchTerm: string, location: string, limit: number, targetList?: string) => {
        setIsScraping(true);
        addLog(`🚀 Inicializujem pozadový proces pre "${searchTerm}"...`);

        try {
            const jobResult = await createScrapeJob({
                search_term: searchTerm,
                location: location,
                limit: limit,
                status: 'w',
                target_list: targetList
            });

            if (!jobResult.success) throw new Error(jobResult.error);

            addLog("✅ Úloha pridaná do poradia.");
            
            // Absolute URL to trigger the worker (important for localhost and production)
            const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
            fetch(`${baseUrl}/api/cron/google-maps-worker`)
                .then(async (res) => {
                    if (res.ok) addLog("📡 Serverový worker bol úspešne pingnutý.");
                    else {
                        const errText = await res.text();
                        addLog(`⚠️ Serverový worker vrátil chybu: ${res.status}`);
                        console.error("Worker trigger failed", errText);
                    }
                })
                .catch(e => {
                    addLog(`❌ Nepodarilo sa kontaktovať server: ${e.message}`);
                    console.error("Worker trigger network error", e);
                });
            
            toast.success("Scraping beží na pozadí. Môžete zavrieť okno.");
            pollJobStatus();

        } catch (e: any) {
            addLog(`❌ Chyba: ${e.message}`);
            setIsScraping(false);
        }
    };

    const stopScraping = useCallback(async () => {
        const jobs = await loadQueue();
        const activeJob = jobs.find(j => j.status === 'r' || j.status === 'w' || j.status === 'p');
        
        if (activeJob) {
            const { updateScrapeJob } = await import('@/app/actions/google-maps-jobs');
            await updateScrapeJob(activeJob.id, { status: 's' });
            addLog("⏹️ Pozadový proces bol zastavený.");
            loadQueue();
        }
    }, [loadQueue, addLog]);

    const forceStartWorker = useCallback(async () => {
        addLog("⚡ Manuálne spúšťam worker...");
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        try {
            const res = await fetch(`${baseUrl}/api/cron/google-maps-worker`);
            if (res.ok) {
                const data = await res.json();
                addLog(`⚡ Worker naštartovaný: ${data.status} (Nájdené: ${data.total_found})`);
                toast.success("Worker bol znova naštartovaný.");
            } else {
                const err = await res.text();
                addLog(`⚠️ Chyba pri štarte: ${res.status} - ${err}`);
                console.error("Force start failed", err);
            }
            pollJobStatus();
        } catch (e: any) {
            addLog(`❌ Sieťová chyba: ${e.message}`);
            toast.error("Nepodarilo sa naštartovať worker.");
        }
    }, [addLog, pollJobStatus]);

    return { isScraping, places, logs, queue, runScraper, stopScraping, loadQueue, forceStartWorker };
}
