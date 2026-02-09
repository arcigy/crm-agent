import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { getScrapeJobs, createScrapeJob, ScrapeJob } from '@/app/actions/google-maps-jobs';
import { ApiKey } from '@/tools/google-maps/ApiKeyManager';
import { ScrapedPlace } from '@/types/google-maps';
import directus from '@/lib/directus';
import { readItems } from '@directus/sdk';

export function useGoogleMapsScraper(keys: ApiKey[], setKeys: React.Dispatch<React.SetStateAction<ApiKey[]>>) {
    const [isScraping, setIsScraping] = useState(false);
    const [places, setPlaces] = useState<ScrapedPlace[]>([]);
    const [logs, setLogs] = useState<string[]>([]);
    const [queue, setQueue] = useState<ScrapeJob[]>([]);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const addLog = useCallback((msg: string) => {
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 99)]);
    }, []);

    const loadQueue = useCallback(async () => {
        const jobs = await getScrapeJobs();
        const activeJobs = jobs.filter(j => j.status === 'queued' || j.status === 'paused' || j.status === 'processing');
        setQueue(activeJobs);
        
        // If there's an active job, we should be in "scraping" mode visually
        const isProcessing = activeJobs.some(j => j.status === 'processing');
        setIsScraping(isProcessing);

        return activeJobs;
    }, []);

    const pollJobStatus = useCallback(async () => {
        const jobs = await loadQueue();
        const processingJob = jobs.find(j => j.status === 'processing');
        
        if (processingJob) {
            // Load newest leads for this job to show in UI
            try {
                const leads = await directus.request(readItems('contacts', {
                    filter: {
                        source_keyword: { _eq: processingJob.search_term },
                        source_city: { _eq: processingJob.location }
                    },
                    limit: 100,
                    sort: ['-date_created']
                }));
                // Map to ScrapedPlace
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
            } catch (e) {
                console.error("Polling leads failed", e);
            }
        } else {
            // No job is processing, stop polling if it was active
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
            setIsScraping(false);
        }
    }, [loadQueue]);

    useEffect(() => {
        loadQueue();
        // Start polling if there are active jobs
        pollIntervalRef.current = setInterval(pollJobStatus, 5000);
        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    }, [loadQueue, pollJobStatus]);

    const runScraper = async (searchTerm: string, location: string, limit: number) => {
        setIsScraping(true);
        addLog(`🚀 Inicializujem pozadový proces pre "${searchTerm}"...`);

        try {
            // 1. Create Job in DB
            const jobResult = await createScrapeJob({
                search_term: searchTerm,
                location: location,
                limit: limit,
                status: 'queued'
            });

            if (!jobResult.success) throw new Error(jobResult.error);

            addLog("✅ Úloha pridaná do poradia. Spúšťam serverový worker...");

            // 2. Ping Background Worker (Trigger first run)
            // We use fetch without await to not block the UI, or just trust the next cron run
            fetch('/api/cron/google-maps-worker').catch(e => console.error("Worker ping failed", e));
            
            toast.success("Scraping beží na pozadí. Môžete zavrieť okno.");
            
            // Start polling immediately
            pollJobStatus();

        } catch (e: any) {
            addLog(`❌ Chyba: ${e.message}`);
            setIsScraping(false);
        }
    };

    const stopScraping = useCallback(async () => {
        // In background mode, "stopping" involves updating the job status in DB
        const jobs = await loadQueue();
        const activeJob = jobs.find(j => j.status === 'processing' || j.status === 'queued' || j.status === 'paused');
        
        if (activeJob) {
            const { updateScrapeJob } = await import('@/app/actions/google-maps-jobs');
            await updateScrapeJob(activeJob.id, { status: 'cancelled' });
            addLog("⏹️ Pozadový proces bol zastavený.");
            loadQueue();
        }
    }, [loadQueue, addLog]);

    return { isScraping, places, logs, queue, runScraper, stopScraping, loadQueue };
}
