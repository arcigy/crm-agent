import React, { useState, useEffect } from 'react';
import { Search, MapPin, Play, StopCircle, History, List, Settings, Database, Clock, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { ToolWrapper } from "@/components/tools/ToolWrapper";
import { ApiKeyManager, ApiKey } from "./ApiKeyManager";
import { useGoogleMapsScraper } from "@/hooks/useGoogleMapsScraper";
import { bulkCreateColdLeads } from "@/app/actions/cold-leads";
import { updateScrapeJob, deleteScrapeJob } from "@/app/actions/google-maps-jobs";

export default function GoogleMapsScraper() {
    const [searchTerm, setSearchTerm] = useState("");
    const [location, setLocation] = useState("Bratislava");
    const [limit, setLimit] = useState(200);
    const [keys, setKeys] = useState<ApiKey[]>([]);
    
    const { isScraping, places, logs, queue, runScraper, stopScraping, loadQueue } = useGoogleMapsScraper(keys, setKeys);

    const handleStart = async () => {
        if (!searchTerm || !location) {
            toast.error("Zadajte kľúčové slovo a lokalitu.");
            return;
        }
        const activeKeys = keys.filter(k => k.status === 'active');
        if (activeKeys.length === 0) {
            toast.error("Pridajte aspoň jeden aktívny kľúč v nastaveniach.");
            return;
        }
        await runScraper(searchTerm, location, limit);
    };

    const handleResume = async (job: any) => {
        setSearchTerm(job.search_term);
        setLocation(job.location);
        setLimit(job.limit);
        await runScraper(job.search_term, job.location, job.limit, job.id);
    };

    const handleCancelJob = async (id: string) => {
        if (confirm("Naozaj chcete zrušiť tento proces v poradí?")) {
            await updateScrapeJob(id, { status: 'cancelled' });
            loadQueue();
            toast.success("Proces bol zrušený.");
        }
    };

    const saveToCrm = async () => {
        if (places.length === 0) return;
        
        const leadsToCreate = places.map(p => ({
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
        
        const result = await bulkCreateColdLeads(leadsToCreate);
        if (result.success) {
            toast.success(`Uložených ${result.count} leadov do CRM!`, {
                action: { label: 'Otvoriť', onClick: () => window.location.href = '/dashboard/cold-outreach' }
            });
            fetch('/api/cron/enrich-leads', { method: 'GET' }).catch(() => {});
        }
    };

    return (
        <ToolWrapper title="Google Maps Scraper" icon={<Database className="text-blue-500" />}>
            <div className="max-w-7xl mx-auto space-y-6 pb-20">
                
                {/* Search Panel */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-blue-500/5 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-2 space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Čo hľadáte?</label>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Napr. Reštaurácie, Autoservisy..." className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Lokalita / Limit</label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Bratislava" className="w-full pl-11 pr-4 py-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 text-sm" />
                            </div>
                            <input type="number" value={limit} onChange={e => setLimit(parseInt(e.target.value))} className="w-20 py-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 text-center font-bold" title="Limit výsledkov" />
                        </div>
                    </div>
                    <button onClick={isScraping ? stopScraping : handleStart} className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${isScraping ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-500/20' : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/20'}`}>
                        {isScraping ? <><StopCircle className="w-6 h-6" /> Zrušiť scraping</> : <><Play className="w-6 h-6" /> Spustiť scraper</>}
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Side: Results & Queue */}
                    <div className="lg:col-span-7 space-y-6">
                        
                        {/* Queue A Panel */}
                        {queue.length > 0 && (
                            <div className="bg-amber-50 rounded-3xl border border-amber-100 p-6 space-y-4">
                                <h3 className="text-amber-900 font-black flex items-center gap-2 uppercase tracking-tight text-sm">
                                    <Clock className="w-4 h-4" /> Queue A (Čakajúce procesy)
                                </h3>
                                <div className="space-y-3">
                                    {queue.map(job => (
                                        <div key={job.id} className="bg-white/80 p-4 rounded-2xl border border-amber-200/50 flex items-center justify-between group">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded-xl ${job.status === 'paused' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600 animate-pulse'}`}>
                                                    {job.status === 'paused' ? <Clock className="w-5 h-5" /> : <RefreshCw className="w-5 h-5 animate-spin" />}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900 leading-none">{job.search_term} <span className="text-gray-400 font-normal">v</span> {job.location}</div>
                                                    <div className="text-[10px] uppercase font-black text-gray-400 mt-1">
                                                        Pokrok: {job.found_count} / {job.limit} • {job.status === 'paused' ? 'Čaká na limit' : 'Spracováva sa'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {job.status === 'paused' && (
                                                    <button onClick={() => handleResume(job)} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm">
                                                        <Play className="w-4 h-4 fill-current" />
                                                    </button>
                                                )}
                                                <button onClick={() => handleCancelJob(job.id)} className="p-2 bg-white text-red-500 border border-red-100 rounded-lg hover:bg-red-50 transition-all shadow-sm">
                                                    <XCircle className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[600px]">
                            <div className="p-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                                <div className="flex items-center gap-2 font-bold text-gray-700">
                                    <List className="w-5 h-5 text-blue-500" /> Nájdené miesta ({places.length})
                                </div>
                                {places.length > 0 && !isScraping && (
                                    <button onClick={saveToCrm} className="text-xs bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 transition-colors">Uložiť do CRM</button>
                                )}
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50/20 font-sans">
                                {places.length === 0 && !isScraping && (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center p-10">
                                        <Database className="w-16 h-16 mb-4 opacity-10" />
                                        <p className="italic font-medium opacity-40 uppercase tracking-widest text-[10px]">Pripravené na vyhľadávanie</p>
                                    </div>
                                )}
                                {places.map((p, i) => (
                                    <div key={p.id} className="p-4 bg-white/50 hover:bg-white rounded-3xl transition-all border border-transparent hover:border-blue-100 flex items-center gap-4 shadow-sm hover:shadow-blue-500/5">
                                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black">{i+1}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-black text-gray-900 text-base truncate">{p.name}</div>
                                            <div className="text-xs text-gray-500 truncate font-medium opacity-70">{p.address}</div>
                                        </div>
                                        <div className="text-[10px] font-black px-3 py-1.5 bg-gray-100 rounded-2xl text-gray-400 uppercase tracking-tighter">{p.source_city}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Logs & API Keys */}
                    <div className="lg:col-span-5 space-y-6">
                        <div className="bg-slate-950 rounded-3xl p-6 shadow-2xl border border-white/5 flex flex-col h-[300px]">
                            <div className="flex items-center gap-2 text-white font-bold mb-4">
                                <History className="w-5 h-5 text-blue-400" /> Console Log
                            </div>
                            <div className="flex-1 overflow-y-auto font-mono text-[11px] space-y-2 pr-2 scrollbar-hide">
                                {logs.map((log, i) => (
                                    <div key={i} className={`p-2 rounded-xl border leading-relaxed ${
                                        log.includes('❌') ? 'bg-red-500/10 border-red-500/20 text-red-400 animate-pulse' : 
                                        log.includes('✅') ? 'bg-green-500/10 border-green-500/20 text-green-400' : 
                                        log.includes('⏸️') ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                        'bg-white/5 border-white/5 text-gray-400 opacity-80'
                                    }`}>
                                        {log}
                                    </div>
                                ))}
                                {isScraping && (
                                    <div className="flex items-center gap-2 p-2 text-blue-400 text-[10px] font-bold animate-pulse">
                                        <RefreshCw className="w-3 h-3 animate-spin" /> Vyhľadávam nové výsledky...
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm h-fit">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <Settings className="w-6 h-6 text-blue-500" /> API Kľúče
                                </h3>
                            </div>
                            <ApiKeyManager onKeysChange={setKeys} />
                        </div>
                    </div>
                </div>
            </div>
        </ToolWrapper>
    );
}
