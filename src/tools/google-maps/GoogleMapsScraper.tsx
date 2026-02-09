import React, { useState } from 'react';
import { Search, MapPin, Play, StopCircle, History, List, Settings, Database } from "lucide-react";
import { toast } from "sonner";
import { ToolWrapper } from "@/components/tools/ToolWrapper";
import { ApiKeyManager, ApiKey } from "./ApiKeyManager";
import { useGoogleMapsScraper } from "@/hooks/useGoogleMapsScraper";
import { bulkCreateColdLeads } from "@/app/actions/cold-leads";

export default function GoogleMapsScraper() {
    const [searchTerm, setSearchTerm] = useState("");
    const [location, setLocation] = useState("Bratislava");
    const [limit, setLimit] = useState(20);
    const [keys, setKeys] = useState<ApiKey[]>([]);
    
    const { isScraping, places, logs, history, runScraper, stopScraping } = useGoogleMapsScraper(keys, setKeys);

    const handleStart = async () => {
        const activeKeys = keys.filter(k => k.status === 'active');
        if (activeKeys.length === 0) {
            toast.error("Pridajte aspoň jeden aktívny kľúč v nastaveniach.");
            return;
        }
        await runScraper(searchTerm, location, limit);
        
        // After finishing, if we have places, save them (simplified sync)
        if (places.length > 0) {
            saveToCrm();
        }
    };

    const saveToCrm = async () => {
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
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Lokalita</label>
                        <div className="relative">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Bratislava" className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>
                    <button onClick={isScraping ? stopScraping : handleStart} className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${isScraping ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/20'}`}>
                        {isScraping ? <><StopCircle className="w-6 h-6" /> Zastaviť</> : <><Play className="w-6 h-6" /> Spustiť scraper</>}
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Side: Results */}
                    <div className="lg:col-span-7 space-y-6">
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[700px]">
                            <div className="p-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                                <div className="flex items-center gap-2 font-bold text-gray-700">
                                    <List className="w-5 h-5 text-blue-500" /> Nájdené miesta ({places.length})
                                </div>
                                {places.length > 0 && !isScraping && (
                                    <button onClick={saveToCrm} className="text-xs bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 transition-colors">Uložiť do CRM</button>
                                )}
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {places.length === 0 && !isScraping && (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center p-10">
                                        <Database className="w-16 h-16 mb-4 opacity-20" />
                                        <p className="italic">Zatiaľ žiadne výsledky. Spustite scraper na vyhľadanie leadov.</p>
                                    </div>
                                )}
                                {places.map((p, i) => (
                                    <div key={p.id} className="p-4 hover:bg-blue-50/50 rounded-2xl transition-all border border-transparent hover:border-blue-100 flex items-center gap-4">
                                        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">{i+1}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-gray-900 text-lg truncate">{p.name}</div>
                                            <div className="text-sm text-gray-500 truncate">{p.address}</div>
                                        </div>
                                        <div className="text-xs font-bold px-3 py-1.5 bg-gray-100 rounded-full text-gray-500 uppercase tracking-tighter">{p.source_city}</div>
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
                            <div className="flex-1 overflow-y-auto font-mono text-[12px] space-y-2 pr-2">
                                {logs.map((log, i) => (
                                    <div key={i} className={`p-2 rounded-lg border leading-relaxed ${
                                        log.includes('❌') ? 'bg-red-500/10 border-red-500/20 text-red-400' : 
                                        log.includes('✅') ? 'bg-green-500/10 border-green-500/20 text-green-400' : 
                                        'bg-white/5 border-white/5 text-gray-300'
                                    }`}>
                                        {log}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm h-fit">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <Settings className="w-6 h-6 text-blue-500" /> Nastavenia Kľúčov
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
