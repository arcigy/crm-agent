import React, { useState, useEffect } from 'react';
import { Search, MapPin, Play, StopCircle, History, List, Settings, Database, Clock, RefreshCw, XCircle, CheckCircle, Zap, Plus, FolderPlus } from "lucide-react";
import { toast } from "sonner";
import { ToolWrapper } from "@/components/tools/ToolWrapper";
import { ApiKeyManager, ApiKey } from "./ApiKeyManager";
import { useGoogleMapsScraper } from "@/hooks/useGoogleMapsScraper";
import { updateScrapeJob } from "@/app/actions/google-maps-jobs";
import { getColdLeadLists, createColdLeadList } from "@/app/actions/cold-leads";

export default function GoogleMapsScraper() {
    const [searchTerm, setSearchTerm] = useState("");
    const [location, setLocation] = useState("Bratislava");
    const [limit, setLimit] = useState(200);
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [lists, setLists] = useState<{id: string, name: string}[]>([]);
    const [targetList, setTargetList] = useState("Zoznam 1");
    
    const { isScraping, places, logs, queue, runScraper, stopScraping, loadQueue, forceStartWorker } = useGoogleMapsScraper(keys, setKeys);

    useEffect(() => {
        const fetchLists = async () => {
            const res = await getColdLeadLists();
            if (res.success && res.data) {
                setLists(res.data as any);
                if (res.data.length > 0 && !targetList) {
                    setTargetList(res.data[0].name);
                }
            }
        };
        fetchLists();
    }, []);

    const handleCreateList = async () => {
        const name = prompt("Zadajte názov nového zoznamu:");
        if (!name) return;
        const res = await createColdLeadList(name);
        if (res.success) {
            toast.success("Zoznam vytvorený");
            const resLists = await getColdLeadLists();
            if (resLists.success && resLists.data) {
                setLists(resLists.data as any);
                setTargetList(name);
            }
        } else {
            toast.error("Chyba: " + res.error);
        }
    };

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
        await runScraper(searchTerm, location, limit, targetList);
    };

    const handleResume = async (job: any) => {
        setSearchTerm(job.search_term);
        setLocation(job.location);
        setLimit(job.limit);
        setTargetList(job.target_list || "Zoznam 1");
        await runScraper(job.search_term, job.location, job.limit, job.target_list);
    };

    const handleCancelJob = async (id: string) => {
        if (confirm("Naozaj chcete zrušiť tento proces v poradí?")) {
            await updateScrapeJob(id, { status: 'cancelled' });
            loadQueue();
            toast.success("Proces bol zrušený.");
        }
    };

    return (
        <ToolWrapper title="Google Maps Scraper" icon={<Database className="text-blue-500" />}>
            <div className="max-w-7xl mx-auto space-y-6 pb-20">
                
                {/* Search Panel */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-blue-500/5 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
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
                    <div className="space-y-2">
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Uložiť do zoznamu</label>
                            <button onClick={handleCreateList} className="text-[10px] text-blue-600 font-black flex items-center gap-1 hover:text-blue-700">
                                <Plus className="w-3 h-3" /> NOVÝ
                            </button>
                        </div>
                        <div className="relative">
                            <FolderPlus className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <select 
                                value={targetList} 
                                onChange={e => setTargetList(e.target.value)} 
                                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm appearance-none outline-none"
                            >
                                {lists.map(l => (
                                    <option key={l.id} value={l.name}>{l.name}</option>
                                ))}
                                {lists.length === 0 && <option value="Zoznam 1">Zoznam 1</option>}
                            </select>
                        </div>
                    </div>
                    <button onClick={isScraping ? stopScraping : handleStart} className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${isScraping ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-500/20' : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/20'}`}>
                        {isScraping ? <><StopCircle className="w-6 h-6" /> Zrušiť</> : <><Play className="w-6 h-6" /> Spustiť</>}
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Side: Results & Queue */}
                    <div className="lg:col-span-7 space-y-6">
                        
                        {/* Active Job Panel */}
                        {queue.some(j => j.status === 'processing') && (
                            <div className="bg-blue-50 rounded-3xl border border-blue-100 p-6 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                <h3 className="text-blue-900 font-black flex items-center gap-2 uppercase tracking-tight text-sm">
                                    <RefreshCw className="w-4 h-4 animate-spin" /> Aktívny proces na serveri
                                </h3>
                                {queue.filter(j => j.status === 'processing').map(job => (
                                    <div key={job.id} className="bg-white p-5 rounded-2xl border border-blue-200/50 shadow-sm">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <div className="font-black text-gray-900 text-lg leading-tight">{job.search_term}</div>
                                                <div className="text-sm text-gray-500 font-medium">Lokalita: <span className="text-blue-600">{job.location}</span></div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-2xl font-black text-blue-600">{job.found_count} <span className="text-gray-300 text-sm">/ {job.limit}</span></div>
                                                <div className="text-[10px] uppercase font-bold text-blue-400">Nájdených firiem</div>
                                            </div>
                                        </div>
                                        <div className="w-full bg-blue-100 h-3 rounded-full overflow-hidden">
                                            <div 
                                                className="bg-blue-600 h-full transition-all duration-1000 ease-out" 
                                                style={{ width: `${Math.min(100, (job.found_count / job.limit) * 100)}%` }}
                                            />
                                        </div>

                                        {/* Error Display */}
                                        {job.last_error && (
                                            <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-700 text-xs animate-pulse">
                                                <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                                <div className="font-medium">
                                                    <span className="font-black uppercase tracking-tight mr-1">Server Error:</span>
                                                    {job.last_error}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Queue A Panel (Waiting/Paused) */}
                        {queue.some(j => j.status !== 'processing') && (
                            <div className="bg-amber-50 rounded-3xl border border-amber-100 p-6 space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-amber-900 font-black flex items-center gap-2 uppercase tracking-tight text-sm">
                                        <Clock className="w-4 h-4" /> Queue A (Čakajúce úlohy)
                                    </h3>
                                    <button 
                                        onClick={forceStartWorker}
                                        className="text-[10px] font-black bg-amber-200 text-amber-900 px-3 py-1 rounded-full hover:bg-amber-300 transition-colors flex items-center gap-1 uppercase"
                                        title="Vynútiť štart worker-a"
                                    >
                                        <Zap className="w-3 h-3 fill-current" /> Bleskový štart
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {queue.filter(j => j.status !== 'processing').map(job => (
                                        <div key={job.id} className="bg-white/80 p-4 rounded-2xl border border-amber-200/50 flex flex-col gap-2 group">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2 rounded-xl bg-amber-100 text-amber-600">
                                                        <Clock className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-900">{job.search_term} <span className="text-gray-400 font-normal">v</span> {job.location}</div>
                                                        <div className="text-[10px] uppercase font-black text-gray-400 mt-1">
                                                            Stav: <span className="text-amber-600">{job.status === 'paused' ? 'Pozastavené' : 'Čaká na server'}</span> • Zostáva: {job.limit - job.found_count}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleCancelJob(job.id)} className="p-2 bg-white text-red-500 border border-red-100 rounded-lg hover:bg-red-50 transition-all shadow-sm">
                                                        <XCircle className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {job.last_error && (
                                                <div className="p-2 bg-red-50/50 border border-red-50 rounded-lg text-[10px] text-red-600 font-medium flex items-center gap-2">
                                                    <XCircle className="w-3 h-3" /> {job.last_error}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {queue.length === 0 && (
                            <div className="bg-gray-50 rounded-3xl border border-dashed border-gray-200 p-12 text-center space-y-3">
                                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center mx-auto text-gray-300">
                                    <Clock className="w-6 h-6" />
                                </div>
                                <div className="text-gray-400 font-bold">Žiadne čakajúce úlohy</div>
                                <div className="text-xs text-gray-300">Zadajte hľadanie vyššie a začnite zbierať leady</div>
                            </div>
                        )}

                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[600px]">
                            <div className="p-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                                <div className="flex items-center gap-2 font-bold text-gray-700">
                                    <List className="w-5 h-5 text-blue-500" /> Nájdené miesta ({places.length})
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-green-500 uppercase tracking-widest flex items-center gap-1 bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
                                        <CheckCircle className="w-3 h-3" /> Auto-Sync Active
                                    </span>
                                </div>
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
                    <div className="lg:col-span-12 xl:col-span-5 space-y-6">
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
                                        log.includes('💾') ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                                        'bg-white/5 border-white/5 text-gray-400 opacity-80'
                                    }`}>
                                        {log}
                                    </div>
                                ))}
                                {isScraping && (
                                    <div className="flex items-center gap-2 p-2 text-blue-400 text-[10px] font-bold animate-pulse">
                                        <RefreshCw className="w-3 h-3 animate-spin" /> Vyhľadávam a ukladám nové výsledky...
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
