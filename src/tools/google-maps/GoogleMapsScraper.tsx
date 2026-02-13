import React, { useState, useEffect } from 'react';
import { Search, MapPin, Play, StopCircle, History, List, Settings, Database, RefreshCw, Zap, Plus, FolderPlus, ArrowLeft, Mail, Loader2, CheckCircle2, XCircle, Download } from "lucide-react";
import Link from "next/link";
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
    
    const { 
        isScraping, 
        places, 
        logs, 
        queue, 
        runScraper, 
        stopScraping, 
        loadQueue, 
        forceStartWorker,
        continueScraping,
        resumingJobId,
        setResumingJobId,
        resumeAmount,
        setResumeAmount,
        resumeJob
    } = useGoogleMapsScraper(keys, setKeys);

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
    }, [targetList]);

    const handleExportCSV = () => {
        if (places.length === 0) return toast.error("Žiadne výsledky na export");

        const headers = ["Name", "Address", "Website", "Phone", "Email", "Status"];
        const csvContent = [
            headers.join(","),
            ...places.map(p => [
                `"${(p.name || "").replace(/"/g, '""')}"`,
                `"${(p.address || "").replace(/"/g, '""')}"`,
                `"${(p.website || "").replace(/"/g, '""')}"`,
                `"${(p.phone || "").replace(/"/g, '""')}"`,
                `"${(p.email || "").replace(/"/g, '""')}"`,
                `"${p.enrichment_status || ""}"`
            ].join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `google_maps_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("CSV exportované");
    };

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
            await updateScrapeJob(id, { status: 's' });
            loadQueue();
            toast.success("Proces bol zrušený.");
        }
    };

    return (
        <ToolWrapper title="Google Maps Scraper" icon={<Database className="text-blue-500" />}>
            <div className="max-w-7xl mx-auto space-y-6 pb-20">
                <Link 
                    href="/dashboard/outreach/leads" 
                    className="flex items-center gap-2 text-xs font-black text-gray-400 hover:text-blue-600 transition-colors uppercase tracking-widest mb-2 w-fit"
                >
                    <ArrowLeft className="w-4 h-4" /> Späť na leady
                </Link>
                
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

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* Left: Active Results (7 cols) */}
                    <div className="lg:col-span-7 flex flex-col gap-6">
                        
                        {/* Status Bar */}
                        <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${isScraping ? 'bg-blue-500 animate-ping' : 'bg-gray-300'}`} />
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                                    {isScraping ? 'Scrapovanie beží...' : 'Scraper pripravený'}
                                </span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-xs font-bold text-gray-400">
                                    NÁJDENÝCH: <span className="text-blue-600 text-sm ml-1">{places.length}</span>
                                </div>
                                <button onClick={() => loadQueue()} className="p-2 hover:bg-gray-50 rounded-xl transition-all text-blue-600">
                                    <RefreshCw className={`w-4 h-4 ${isScraping ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        </div>

                        {/* Places List */}
                        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-blue-500/5 flex flex-col">
                            <div className="p-5 border-b border-gray-50 bg-gray-50/30 flex justify-between items-center">
                                <h3 className="font-black text-gray-900 uppercase tracking-tight text-sm flex items-center gap-2">
                                    <Database className="w-4 h-4 text-blue-500" /> Aktuálne výsledky
                                </h3>
                                <div className="flex items-center gap-4">
                                     <button 
                                        onClick={handleExportCSV}
                                        className="text-[10px] font-black text-green-600 hover:bg-green-50 px-3 py-1.5 rounded-xl border border-green-100 flex items-center gap-2 transition-all"
                                    >
                                        <Download className="w-3 h-3" /> EXPORT
                                    </button>
                                    <a href="/dashboard/outreach/leads" className="text-[10px] font-black text-blue-600 hover:underline uppercase tracking-widest">
                                        Správa leadov →
                                    </a>
                                </div>
                            </div>
                            <div className="p-4 space-y-3 bg-gray-50/20">
                                {places.length === 0 && !isScraping && (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-40">
                                        <Search className="w-12 h-12 mb-4" />
                                        <p className="font-bold uppercase tracking-widest text-xs">Pripravené na hľadanie</p>
                                    </div>
                                )}
                                {places.map((p, i) => (
                                    <div key={p.id || i} className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center gap-4 group">
                                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-lg">
                                            {i + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-black text-gray-900 group-hover:text-blue-600 transition-colors truncate uppercase tracking-tight flex items-center gap-2">
                                                {p.name}
                                                {p.enrichment_status === 'completed' && p.email && (
                                                    <span className="text-[9px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100 flex items-center gap-1 normal-case tracking-normal">
                                                        <Mail className="w-2 h-2" /> {p.email}
                                                    </span>
                                                )}
                                            </h4>
                                            <div className="flex items-center gap-3 text-xs text-gray-400 font-bold">
                                                <div className="flex items-center gap-1">
                                                    <MapPin className="w-3 h-3 text-gray-300" /> {p.address}
                                                </div>
                                                
                                                {/* Enrichment Status Badges */}
                                                {p.enrichment_status === 'pending' || p.enrichment_status === 'processing' ? (
                                                    <div className="flex items-center gap-1.5 text-blue-500 bg-blue-50/50 px-2 py-0.5 rounded-full animate-pulse border border-blue-100/50">
                                                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                                        <span className="text-[9px] uppercase tracking-widest font-black">Hľadám e-mail...</span>
                                                    </div>
                                                ) : p.enrichment_status === 'completed' ? (
                                                    <div className="flex items-center gap-1.5 text-green-600 bg-green-50/50 px-2 py-0.5 rounded-full border border-green-100/50">
                                                        <CheckCircle2 className="w-2.5 h-2.5" />
                                                        <span className="text-[9px] uppercase tracking-widest font-black">E-mail nájdený</span>
                                                    </div>
                                                ) : p.enrichment_status === 'failed' ? (
                                                    <div className="flex items-center gap-1.5 text-orange-400 bg-orange-100/30 px-2 py-0.5 rounded-full border border-orange-100/30">
                                                        <XCircle className="w-2.5 h-2.5" />
                                                        <span className="text-[9px] uppercase tracking-widest font-black text-gray-400">Bez e-mailu</span>
                                                    </div>
                                                ) : p.website ? (
                                                     <div className="flex items-center gap-1.5 text-gray-300 px-2 py-0.5">
                                                        <Loader2 className="w-2.5 h-2.5 animate-spin opacity-20" />
                                                        <span className="text-[9px] uppercase tracking-widest font-black">Pripravujem...</span>
                                                     </div>
                                                ) : (
                                                    <span className="text-[9px] uppercase tracking-widest font-black text-gray-300">Pauza</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {p.phone && (
                                                <a href={`tel:${p.phone}`} className="p-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-100 transition-all">
                                                    <Zap className="w-4 h-4 fill-blue-600" />
                                                </a>
                                            )}
                                            {p.website && (
                                                <a href={p.website} target="_blank" className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-gray-100 transition-all">
                                                    <List className="w-4 h-4" />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right: History & Settings (5 cols) */}
                    <div className="lg:col-span-5 flex flex-col gap-6">
                        
                        {/* History */}
                        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-blue-500/5 flex flex-col h-[300px] overflow-hidden">
                            <div className="p-5 border-b border-gray-50 bg-gray-50/30 flex justify-between items-center">
                                <h3 className="font-black text-gray-900 uppercase tracking-tight text-sm flex items-center gap-2">
                                    <History className="w-4 h-4 text-gray-400" /> Posledné úlohy
                                </h3>
                                <button onClick={forceStartWorker} className="text-[9px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-full hover:bg-blue-100">
                                    VYNÚTIŤ WORKER
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {queue.map((job) => (
                                    <div key={job.id} className={`p-4 rounded-3xl border transition-all ${job.status === 'r' ? 'bg-blue-50/50 border-blue-100 ring-2 ring-blue-50' : 'bg-white border-gray-100'}`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <p className="font-black text-gray-900 uppercase tracking-tight text-sm leading-tight">{job.search_term}</p>
                                                <p className="text-[10px] text-gray-500 font-bold">{job.location}</p>
                                            </div>
                                            <div className="flex gap-1">
                                                {['p', 'error'].includes(job.status) && (
                                                    <button onClick={() => resumeJob(job.id)} className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700" title="Pokračovať v prerušenej úlohe">
                                                        <Play className="w-3 h-3" />
                                                    </button>
                                                )}
                                                {job.status === 'd' && (
                                                    <button 
                                                        onClick={() => setResumingJobId(resumingJobId === job.id ? null : job.id)} 
                                                        className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                                                        title="Pokračovať v hľadaní"
                                                    >
                                                        <RefreshCw className="w-3 h-3" />
                                                    </button>
                                                )}
                                                {['r', 'w'].includes(job.status) && (
                                                    <button onClick={() => handleCancelJob(job.id)} className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100">
                                                        <StopCircle className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {resumingJobId === job.id && (
                                            <div className="mb-4 p-3 bg-green-50 rounded-2xl border border-green-100 flex flex-col gap-2 animate-in slide-in-from-top-2 duration-200">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-black text-green-700 uppercase tracking-widest">Koľko pridať?</span>
                                                    <button onClick={() => setResumingJobId(null)} className="text-gray-400 hover:text-gray-600">
                                                        <XCircle className="w-3 h-3" />
                                                    </button>
                                                </div>
                                                <div className="flex gap-2">
                                                    <input 
                                                        type="number" 
                                                        value={resumeAmount}
                                                        onChange={(e) => setResumeAmount(e.target.value)}
                                                        className="flex-1 px-3 py-1.5 rounded-xl border border-green-200 text-xs font-bold outline-none focus:ring-2 focus:ring-green-500"
                                                        placeholder="+ výsledkov"
                                                    />
                                                    <button 
                                                        onClick={() => {
                                                            continueScraping(job.id, parseInt(resumeAmount));
                                                            setResumingJobId(null);
                                                        }}
                                                        className="px-4 py-1.5 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-700 transition-all shadow-sm"
                                                    >
                                                        Štart
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between">
                                            <div className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                                                {job.found_count} / {job.limit}
                                            </div>
                                            <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                                job.status === 'd' ? 'bg-green-100 text-green-700' :
                                                job.status === 'r' ? 'bg-blue-600 text-white animate-pulse' :
                                                'bg-gray-100 text-gray-500'
                                            }`}>
                                                {job.status === 'r' ? 'Scraping' : job.status === 'd' ? 'DONE' : job.status === 'w' ? 'Wait' : job.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Logs */}
                        <div className="bg-slate-900 rounded-[2rem] shadow-2xl flex flex-col h-[200px] overflow-hidden border border-white/5">
                            <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
                                <h3 className="text-white/50 font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /> Live Console
                                </h3>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 font-mono text-[9px] space-y-1">
                                {logs.map((log, i) => (
                                    <div key={i} className={`p-1 ${
                                        log.includes('❌') ? 'text-red-400' :
                                        log.includes('✅') ? 'text-green-400' :
                                        log.includes('💾') ? 'text-blue-400' :
                                        'text-gray-500'
                                    }`}>
                                        {log}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* API Keys */}
                        <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm max-h-[600px] overflow-y-auto custom-scrollbar">
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2 sticky top-0 bg-white z-10 py-2 -mt-2">
                                <Settings className="w-4 h-4 text-blue-500" /> API Kľúče
                            </h3>
                            <ApiKeyManager onKeysChange={setKeys} />
                        </div>

                    </div>
                </div>
            </div>
        </ToolWrapper>
    );
}
