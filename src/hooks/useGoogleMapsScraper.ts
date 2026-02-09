import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { getScrapeJobs, createScrapeJob, ScrapeJob } from '@/app/actions/google-maps-jobs';
import { ApiKey } from '@/tools/google-maps/ApiKeyManager';
import { ScrapedPlace } from '@/types/google-maps';
import directus from '@/lib/directus';
import { readItems } from '@directus/sdk';

export function useGoogleMapsScraper(keys?: ApiKey[], setKeys?: React.Dispatch<React.SetStateAction<ApiKey[]>>) {
    const [isScraping, setIsScraping] = useState(false);
    const [places, setPlaces] = useState<ScrapedPlace[]>([]);
    const [logs, setLogs] = useState<string[]>([]);
    const [queue, setQueue] = useState<ScrapeJob[]>([]);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const addLog = useCallback((msg: string) => {
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 99)]);
    }, []);

    const loadQueue = useCallback(async () => {
        try {
            const jobs = await getScrapeJobs();
            const activeJobs = jobs.filter(j => j.status === 'queued' || j.status === 'paused' || j.status === 'processing');
            setQueue(activeJobs);
            
            const isProcessing = activeJobs.some(j => j.status === 'processing' || j.status === 'queued');
            setIsScraping(isProcessing);

            return activeJobs;
        } catch (e) {
            console.error("Load queue failed", e);
            return [];
        }
    }, []);

    const pollJobStatus = useCallback(async () => {
        const jobs = await loadQueue();
        const activeJob = jobs.find(j => j.status === 'processing' || j.status === 'queued');
        
        if (activeJob) {
            try {
                // Use Server Action to avoid CORS issues
                const { getJobLeads } = await import('@/app/actions/google-maps-jobs');
                const leads = await getJobLeads(activeJob.id);

                const mappedLeads: ScrapedPlace[] = (leads as any[]).map(l => ({
                    id: String(l.id),
                    name: l.title,
                    address: l.formatted_address || l.city,
                    phone: l.phone,
                    website: l.website,
                    url: l.google_maps_url,
                    source_city: l.source_city
                }));
                setPlaces(mappedLeads);
                
                if (activeJob.status === 'processing') {
                    // Update logs only if we see progress
                    // (Log update logic could be added here if needed)
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
        }
    }, [loadQueue]);

    useEffect(() => {
        loadQueue();
        pollIntervalRef.current = setInterval(pollJobStatus, 5000);
        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    }, [loadQueue, pollJobStatus]);

    const runScraper = async (searchTerm: string, location: string, limit: number) => {
        setIsScraping(true);
        addLog(`🚀 Inicializujem pozadový proces pre "${searchTerm}"...`);

        try {
            const jobResult = await createScrapeJob({
                search_term: searchTerm,
                location: location,
                limit: limit,
                status: 'queued'
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
        const activeJob = jobs.find(j => j.status === 'processing' || j.status === 'queued' || j.status === 'paused');
        
        if (activeJob) {
            const { updateScrapeJob } = await import('@/app/actions/google-maps-jobs');
            await updateScrapeJob(activeJob.id, { status: 'cancelled' });
            addLog("⏹️ Pozadový proces bol zastavený.");
            loadQueue();
        }
    }, [loadQueue, addLog]);

    const forceStartWorker = useCallback(async () => {
        addLog("⚡ Manuálne spúšťam worker...");
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        try {
            await fetch(`${baseUrl}/api/cron/google-maps-worker`, { mode: 'no-cors' });
            toast.success("Worker bol znova naštartovaný.");
            pollJobStatus();
        } catch (e) {
            toast.error("Nepodarilo sa naštartovať worker.");
        }
    }, [addLog, pollJobStatus]);

    return { isScraping, places, logs, queue, runScraper, stopScraping, loadQueue, forceStartWorker };
}
