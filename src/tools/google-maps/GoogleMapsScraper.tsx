
import React, { useState } from 'react';
import { ApiKeyManager, ApiKey } from './ApiKeyManager';
import { MapPin, Search, Play, Pause, Loader2, Globe, Database } from 'lucide-react';
import { toast } from 'sonner';

export default function GoogleMapsScraper() {
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [location, setLocation] = useState('Slovensko');
    const [limit, setLimit] = useState(500);
    const [isScraping, setIsScraping] = useState(false);
    const [foundCount, setFoundCount] = useState(0);

    const handleStart = () => {
        const activeKeys = keys.filter(k => k.status === 'active');
        if (activeKeys.length === 0) {
            toast.error("No active API keys found! Add valid keys first.");
            return;
        }

        if (!searchTerm.trim()) {
            toast.error("Enter a search term (e.g. Geodet).");
            return;
        }

        setIsScraping(true);
        toast.info(`Starting scraper with ${activeKeys.length} keys...`);
        
        // Simulation of scraping process
        // In real implementation, this would trigger a backend job with the list of keys
    };

    const handleStop = () => {
        setIsScraping(false);
        toast.info("Scraper paused.");
    };

    return (
        <div className="max-w-7xl mx-auto p-8 space-y-8 animate-in fade-in duration-500">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">Google Maps Scraper</h1>
                    <p className="text-lg text-gray-500 font-medium">Budovanie databázy kontaktov na autopilota.</p>
                </div>
                {isScraping && (
                    <div className="flex items-center gap-3 px-6 py-3 bg-indigo-50 text-indigo-700 rounded-2xl animate-pulse">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="font-black uppercase tracking-widest text-xs">Scraping in progress...</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Column: Controls */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Setup Card */}
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-gray-100">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600">
                                <Search className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-black text-gray-900 tracking-tight">Parametre vyhľadávania</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div className="space-y-2">
                                <label className="ml-1 text-xs font-black uppercase tracking-widest text-gray-400">Kľúčové slovo (Profesia)</label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        placeholder="napr. Geodet, Kurenár..."
                                        className="w-full h-14 bg-gray-50 border-2 border-gray-100 rounded-2xl pl-12 pr-4 font-bold text-gray-900 focus:border-blue-500 focus:bg-white transition-all outline-none placeholder:text-gray-300"
                                    />
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="ml-1 text-xs font-black uppercase tracking-widest text-gray-400">Lokalita (Krajina / Mesto)</label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        value={location}
                                        onChange={e => setLocation(e.target.value)}
                                        placeholder="napr. Slovensko"
                                        className="w-full h-14 bg-gray-50 border-2 border-gray-100 rounded-2xl pl-12 pr-4 font-bold text-gray-900 focus:border-blue-500 focus:bg-white transition-all outline-none placeholder:text-gray-300"
                                    />
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="ml-1 text-xs font-black uppercase tracking-widest text-gray-400">Max Limit</label>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        value={limit}
                                        onChange={e => setLimit(Number(e.target.value))}
                                        className="w-full h-14 bg-gray-50 border-2 border-gray-100 rounded-2xl pl-12 pr-4 font-bold text-gray-900 focus:border-blue-500 focus:bg-white transition-all outline-none"
                                    />
                                    <Database className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                            <div className="text-xs font-medium text-gray-400">
                                <strong className="text-gray-900">{foundCount}</strong> firiem nájdených (Session)
                            </div>
                            
                            <button
                                onClick={isScraping ? handleStop : handleStart}
                                className={`px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl flex items-center gap-3 transition-all transform active:scale-95 ${
                                    isScraping 
                                    ? "bg-red-50 text-red-600 hover:bg-red-100" 
                                    : "bg-gray-900 text-white hover:bg-black hover:shadow-2xl"
                                }`}
                            >
                                {isScraping ? (
                                    <>
                                        <Pause className="w-4 h-4" /> Pozastaviť
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-4 h-4" /> Spustiť Scraper
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Results Preview (Placeholder) */}
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 opacity-60">
                         <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-2xl bg-green-100 flex items-center justify-center text-green-600">
                                <Globe className="w-5 h-5" />
                            </div>
                            <h2 className="text-lg font-black text-gray-900 tracking-tight">Live Výsledky</h2>
                        </div>
                        <div className="h-40 flex items-center justify-center text-gray-400 text-sm font-bold bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
                            Scraper is inactive. Start to see leads pouring in.
                        </div>
                    </div>
                </div>

                {/* Right Column: Key Manager */}
                <div className="lg:col-span-1">
                    <ApiKeyManager onKeysChange={setKeys} />
                </div>
            </div>
        </div>
    );
}
