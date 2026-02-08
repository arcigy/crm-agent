import React, { useState, useRef, useEffect } from 'react';
import { ApiKeyManager, ApiKey } from './ApiKeyManager';
import { MapPin, Search, Play, Pause, Loader2, Globe, Database, Terminal, Phone, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { searchBusinesses, getPlaceDetails } from '@/app/actions/google-maps';

interface ScrapedPlace {
    id: string;
    name: string;
    address?: string;
    phone?: string;
    website?: string;
    rating?: number;
    url?: string;
}

interface ScrapeJob {
    id: string;
    date: string;
    keyword: string;
    location: string;
    foundCount: number;
    cost: number;
    status: 'completed' | 'stopped' | 'failed';
}

export default function GoogleMapsScraper() {
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [location, setLocation] = useState('Slovensko');
    const [limit, setLimit] = useState(50); 
    const [isScraping, setIsScraping] = useState(false);
    
    // History
    const [history, setHistory] = useState<ScrapeJob[]>([]);

    // Load history on mount
    useEffect(() => {
        const saved = localStorage.getItem('scraper_history');
        if (saved) {
            try {
                setHistory(JSON.parse(saved));
            } catch (e) { console.error("Failed to load history", e); }
        }
    }, []);

    const saveJob = (job: ScrapeJob) => {
        const newHistory = [job, ...history];
        setHistory(newHistory);
        localStorage.setItem('scraper_history', JSON.stringify(newHistory));
    };
    
    // Ref pre okamžitú kontrolu stavu v loope (React state je async)
    const isScrapingRef = useRef(false);
    
    // Results & Logs
    const [places, setPlaces] = useState<ScrapedPlace[]>([]);
    const [logs, setLogs] = useState<string[]>([]);
    const logsEndRef = useRef<HTMLDivElement>(null);

    // Scroll logs to bottom
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    const addLog = (msg: string) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    const handleStop = () => {
        setIsScraping(false);
        isScrapingRef.current = false; // Stop loop immediately
        addLog("🛑 Scraping zastavený užívateľom.");
        toast.info("Scraper paused.");
    };

    const runScraper = async () => {
        const activeKeys = keys.filter(k => k.status === 'active');
        if (activeKeys.length === 0) {
            toast.error("Žiadne aktívne kľúče! Pridajte a overte kľúče.");
            return;
        }
        if (!searchTerm.trim()) {
            toast.error("Zadajte kľúčové slovo.");
            return;
        }

        setIsScraping(true);
        isScrapingRef.current = true; // Set Ref to allow loop
        
        setPlaces([]);
        setLogs([]);
        addLog(`🚀 Štartujem scraper pre "${searchTerm}" v "${location}"`);
        addLog(`🔑 Mám ${activeKeys.length} aktívnych kľúčov.`);

        let totalFound = 0;
        let keyIndex = 0;
        let pageToken: string | undefined = undefined;

        try {
            while (totalFound < limit && isScrapingRef.current) {
                // Check if stopped
                // Note: In React state won't update instantly inside loop, so we rely on a ref or break logic if needed.
                // Here we might need a ref for isScraping to break loop instantly, but for now we rely on re-renders not happening fast enough to break cleanly without ref.
                // Better approach: use a ref for scraping status.
                
                if (keyIndex >= activeKeys.length) {
                    addLog("❌ Minuli sa všetky kľúče.");
                    break;
                }

                const currentKey = activeKeys[keyIndex];
                const keyOwner = currentKey.ownerEmail || 'Neznámy vlastník';
                addLog(`🔄 Používam kľúč: ${keyOwner}`);

                // Helper to update usage
                const incrementUsage = (cost: number) => {
                    // Update Local State
                    setKeys(prev => {
                        const newKeys = prev.map(k => k.id === currentKey.id ? { ...k, usageMonth: k.usageMonth + cost } : k);
                        // Update Local Storage immediately purely for persistence
                        localStorage.setItem('google_maps_api_keys', JSON.stringify(newKeys));
                        return newKeys;
                    });
                };

                // 1. Search
                try {
                    const query = `${searchTerm} in ${location}`;
                    
                    incrementUsage(1); // Cost of Search
                    // Pass pageToken ONLY if we have one
                    const searchResult: any = await searchBusinesses(currentKey.key, query, pageToken);
                    
                    if (!searchResult.results || searchResult.results.length === 0) {
                        addLog("⚠️ Žiadne výsledky na tejto strane.");
                        break; 
                    }

                    addLog(`✅ Našiel som ${searchResult.results.length} firiem. Sťahujem detaily...`);

                    // 2. Details for each
                    for (const rawPlace of searchResult.results) {
                         if (totalFound >= limit) break;

                         // Skip if already exists
                         if (places.some(p => p.id === rawPlace.place_id)) continue;

                         incrementUsage(1); // Cost of Details
                         const details: any = await getPlaceDetails(currentKey.key, rawPlace.place_id);
                         
                         if (details) {
                             const newPlace: ScrapedPlace = {
                                 id: details.place_id,
                                 name: details.name,
                                 address: details.formatted_address,
                                 phone: details.formatted_phone_number || details.international_phone_number,
                                 website: details.website,
                                 rating: details.rating,
                                 url: details.url
                             };
                             
                             setPlaces(prev => [...prev, newPlace]);
                             totalFound++;
                             addLog(`   -> ${newPlace.name} (${newPlace.phone || 'No phone'})`);
                         }
                         
                         // Small delay to be nice to API
                         await new Promise(r => setTimeout(r, 200));
                    }

                    // 3. Pagination
                    if (searchResult.next_page_token && totalFound < limit) {
                        pageToken = searchResult.next_page_token;
                        addLog("⏳ Google má ďalšiu stranu. Čakám 2s...");
                        await new Promise(r => setTimeout(r, 2000)); 
                    } else {
                        if (!searchResult.next_page_token) {
                            addLog("🏁 Google už nemá žiadne ďalšie strany pre tento výraz.");
                        } else {
                            addLog("🏁 Limit užívateľa dosiahnutý.");
                        }
                        break;
                    }

                } catch (err: any) {
                    addLog(`❌ Chyba s kľúčom ${currentKey.key.substring(0,4)}...: ${err.message}`);
                    keyIndex++; 
                    pageToken = undefined; 
                }
            }
        } catch (e) {
            console.error(e);
            addLog("💥 Kritická chyba scrapera.");
        } finally {
            setIsScraping(false);
            addLog(`🏁 Hotovo. Nájdených ${totalFound} firiem.`);
            
            // Save to History
            saveJob({
                id: crypto.randomUUID(),
                date: new Date().toISOString(),
                keyword: searchTerm,
                location: location,
                foundCount: totalFound,
                cost: totalFound * 2 + (totalFound > 0 ? 1 : 0), // Rough estimate: 1 search + 2 per detail
                status: 'completed'
            });

            addLog("📊 --- SESSION SUMMARY ---");
            addLog(`Celkovo nájdených: ${totalFound}`);
            toast.success(`Scraping finished! Found ${totalFound} businesses.`);
        }
    };

    const handleExport = () => {
        if (places.length === 0) {
            toast.error("Žiadne dáta na export.");
            return;
        }

        const headers = ["Name", "Phone", "Website", "Address", "Rating", "Google Maps URL"];
        const rows = places.map(p => [
            `"${p.name.replace(/"/g, '""')}"`,
            `"${(p.phone || '').replace(/"/g, '""')}"`,
            `"${(p.website || '').replace(/"/g, '""')}"`,
            `"${(p.address || '').replace(/"/g, '""')}"`,
            p.rating || '',
            `"${(p.url || '').replace(/"/g, '""')}"`
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `leads_${searchTerm}_${location}_${new Date().toISOString().slice(0,10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("CSV stiahnuté!");
    };

    // Ref pre sledovanie stavu isScraping vo vnutri async funkcie (React stale problem)
    // Pre jednoduchost, tlacidlo Stop len nastavi state, ale loop sa zastavi az v dalsej iteracii.

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
                
                {/* Left Column: Controls & Console */}
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
                                        disabled={isScraping}
                                        className="w-full h-14 bg-gray-50 border-2 border-gray-100 rounded-2xl pl-12 pr-4 font-bold text-gray-900 focus:border-blue-500 focus:bg-white transition-all outline-none placeholder:text-gray-300 disabled:opacity-50"
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
                                        disabled={isScraping}
                                        className="w-full h-14 bg-gray-50 border-2 border-gray-100 rounded-2xl pl-12 pr-4 font-bold text-gray-900 focus:border-blue-500 focus:bg-white transition-all outline-none placeholder:text-gray-300 disabled:opacity-50"
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
                                        disabled={isScraping}
                                        className="w-full h-14 bg-gray-50 border-2 border-gray-100 rounded-2xl pl-12 pr-4 font-bold text-gray-900 focus:border-blue-500 focus:bg-white transition-all outline-none disabled:opacity-50"
                                    />
                                    <Database className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                </div>
                            </div>

                             <div className="flex items-end justify-end">
                                <button
                                    onClick={isScraping ? handleStop : runScraper}
                                    className={`w-full h-14 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all transform active:scale-95 ${
                                        isScraping 
                                        ? "bg-red-50 text-red-600 hover:bg-red-100" 
                                        : "bg-gray-900 text-white hover:bg-black hover:shadow-2xl"
                                    }`}
                                >
                                    {isScraping ? (
                                        <>
                                            <Pause className="w-4 h-4" /> Stop
                                        </>
                                    ) : (
                                        <>
                                            <Play className="w-4 h-4" /> Štart Scrapera
                                        </>
                                    )}
                                </button>
                             </div>
                        </div>
                    </div>

                    {/* Console & Results */}
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 overflow-hidden">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-gray-900 flex items-center justify-center text-white">
                                    <Terminal className="w-5 h-5" />
                                </div>
                                <h2 className="text-lg font-black text-gray-900 tracking-tight">Konzola & Výsledky ({places.length})</h2>
                            </div>
                            
                            {places.length > 0 && (
                                <button 
                                    onClick={handleExport}
                                    className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl transition-all"
                                >
                                    <Database className="w-4 h-4" /> Stiahnuť CSV
                                </button>
                            )}
                        </div>

                        {/* Terminal Log */}
                        <div className="bg-gray-900 rounded-2xl p-4 h-48 overflow-y-auto mb-6 font-mono text-xs text-green-400 space-y-1 shadow-inner">
                            {logs.length === 0 && <span className="text-gray-600 italic">Waiting to start...</span>}
                            {logs.map((log, i) => (
                                <div key={i} className="break-all">{log}</div>
                            ))}
                            <div ref={logsEndRef} />
                        </div>

                        {/* Results Table Preview */}
                        {places.length > 0 && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="text-[10px] uppercase font-black text-gray-400 tracking-widest border-b border-gray-100">
                                        <tr>
                                            <th className="pb-3 px-2">Firma</th>
                                            <th className="pb-3 px-2">Telefón</th>
                                            <th className="pb-3 px-2">Web</th>
                                            <th className="pb-3 px-2 text-right">Rating</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {places.map((place) => (
                                            <tr key={place.id} className="hover:bg-gray-50/50">
                                                <td className="py-3 px-2 font-bold text-gray-900">{place.name}</td>
                                                <td className="py-3 px-2 text-gray-500 flex items-center gap-1">
                                                    {place.phone ? (
                                                        <><Phone className="w-3 h-3" /> {place.phone}</>
                                                    ) : '-'}
                                                </td>
                                                <td className="py-3 px-2 text-blue-600">
                                                    {place.website ? (
                                                        <a href={place.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline">
                                                            Web <ExternalLink className="w-3 h-3" />
                                                        </a>
                                                    ) : '-'}
                                                </td>
                                                <td className="py-3 px-2 text-right font-bold text-amber-500">
                                                    {place.rating || '-'} ★
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                    
                    {/* History Section */}
                    {history.length > 0 && (
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
                             <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
                                    <Database className="w-5 h-5" />
                                </div>
                                <h2 className="text-lg font-black text-gray-900 tracking-tight">História Scrapingu</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="text-[10px] uppercase font-black text-gray-400 tracking-widest border-b border-gray-100">
                                        <tr>
                                            <th className="pb-3 px-2">Dátum</th>
                                            <th className="pb-3 px-2">Kľúčové slovo</th>
                                            <th className="pb-3 px-2">Lokalita</th>
                                            <th className="pb-3 px-2 text-right">Nájdené</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {history.slice(0, 5).map((job) => (
                                            <tr key={job.id} className="hover:bg-gray-50/50 text-gray-600">
                                                <td className="py-3 px-2 text-gray-400">{new Date(job.date).toLocaleString()}</td>
                                                <td className="py-3 px-2 font-bold text-gray-900">{job.keyword}</td>
                                                <td className="py-3 px-2">{job.location}</td>
                                                <td className="py-3 px-2 text-right font-bold text-indigo-600">
                                                    {job.foundCount}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Key Manager */}
                <div className="lg:col-span-1">
                    <ApiKeyManager onKeysChange={setKeys} />
                </div>
            </div>
        </div>
    );
}
