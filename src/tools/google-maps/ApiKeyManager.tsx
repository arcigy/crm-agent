
import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Plus, Trash2, RefreshCw, Key, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

export interface ApiKey {
    id: string;
    key: string;
    label: string;
    status: 'active' | 'error' | 'limit_reached' | 'validating';
    usageMonth: number;
    usageLimit: number;
    lastUsed?: string;
    errorMessage?: string;
}

interface ApiKeyManagerProps {
    onKeysChange: (keys: ApiKey[]) => void;
}

export function ApiKeyManager({ onKeysChange }: ApiKeyManagerProps) {
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [importText, setImportText] = useState('');
    const [isImporting, setIsImporting] = useState(false);

    // Initial Load
    useEffect(() => {
        const saved = localStorage.getItem('google_maps_keys');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setKeys(parsed);
                onKeysChange(parsed);
            } catch (e) {
                console.error("Failed to load keys", e);
            }
        }
    }, []);

    // Save on change
    useEffect(() => {
        localStorage.setItem('google_maps_keys', JSON.stringify(keys));
        onKeysChange(keys);
    }, [keys]);

    const handleImport = async () => {
        if (!importText.trim()) return;
        setIsImporting(true);

        try {
            const lines = importText.split('\n').map(l => l.trim()).filter(l => l.length > 5);
            const newKeys: ApiKey[] = [];

            for (const line of lines) {
                let keyStr = line;
                // Basic cleanup if user pastes "KEY=AIza..."
                if (keyStr.includes("=")) keyStr = keyStr.split("=")[1].trim();
                
                let label = `Key ${keys.length + newKeys.length + 1}`;

                if (keyStr.length < 10) continue;
                if (keys.find(k => k.key === keyStr) || newKeys.find(k => k.key === keyStr)) continue;

                newKeys.push({
                    id: crypto.randomUUID(),
                    key: keyStr,
                    label: label,
                    status: 'validating',
                    usageMonth: 0,
                    usageLimit: 5000, 
                    lastUsed: new Date().toISOString()
                });
            }

            if (newKeys.length === 0) {
                toast.warning("No valid new keys found.");
                setIsImporting(false);
                return;
            }

            const updatedKeys = [...keys, ...newKeys];
            setKeys(updatedKeys);
            setImportText('');
            toast.success(`Imported ${newKeys.length} keys successfully.`);
            validateKeys(newKeys);

        } catch (e) {
            toast.error("Import failed.");
        } finally {
            setIsImporting(false);
        }
    };

    const validateKeys = async (keysToValidate: ApiKey[]) => {
        // Validation simulation
        const validated = await Promise.all(keysToValidate.map(async (k) => {
            await new Promise(r => setTimeout(r, 600 + Math.random() * 800));
            const isValid = k.key.startsWith("AIza") || k.key.length > 25; 
            return {
                ...k,
                status: isValid ? 'active' : 'error',
                errorMessage: isValid ? undefined : 'Invalid Key Format (Must start with AIza...)'
            } as ApiKey;
        }));

        setKeys(prev => prev.map(p => {
            const v = validated.find(v => v.id === p.id);
            return v ? v : p;
        }));
    };

    const deleteKey = (id: string) => {
        setKeys(prev => prev.filter(k => k.id !== id));
        toast.success("Key removed.");
    };

    const resetUsage = (id: string) => {
        setKeys(prev => prev.map(k => k.id === id ? { ...k, usageMonth: 0, status: 'active' } : k));
        toast.success("Usage counter reset.");
    };

    const totalUsage = keys.reduce((acc, k) => acc + k.usageMonth, 0);
    const totalLimit = keys.reduce((acc, k) => acc + k.usageLimit, 0);

    return (
        <div className="w-full bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-gray-50/80 px-8 py-6 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                        <Key className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-gray-900 tracking-tight">Správca Google API Kľúčov</h3>
                        <div className="flex flex-wrap gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">
                            <a href="https://console.cloud.google.com/google/maps-apis/credentials" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 hover:underline flex items-center gap-1">
                                1. Get API Key ↗
                            </a>
                            <a href="https://console.cloud.google.com/google/maps-apis/library/places-backend.googleapis.com" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 hover:underline flex items-center gap-1">
                                2. Enable Places API ↗
                            </a>
                            <a href="https://console.cloud.google.com/billing" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1">
                                💲 Check FREE Credit Usage ↗
                            </a>
                        </div>
                    </div>
                </div>
                <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 ${totalUsage > totalLimit ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}>
                    <ShieldAlert className="w-4 h-4" />
                    Limit: {totalLimit} reqs/mo
                </div>
            </div>

            <div className="px-8 pt-0 pb-8 space-y-8">
                {/* Guide */}
                <div className="bg-blue-50/50 rounded-2xl p-5 border border-blue-100 text-sm text-blue-900 space-y-2">
                    <h4 className="font-bold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Ako získať kľúč zadarmo? (Step-by-Step)
                    </h4>
                    <ol className="list-decimal list-inside space-y-1 ml-1 text-xs font-medium text-blue-800/80">
                        <li>Otvorte <strong>Google Cloud Console</strong> (linky vyššie).</li>
                        <li>Vytvorte nový projekt (každý Google účet má $200 kredit mesačne zdarma).</li>
                        <li>Chodťe do <strong>Library</strong> a povoľte <strong>"Places API (New)"</strong>.</li>
                        <li>Chodťe do <strong>Credentials</strong> a kliknite <strong>Create Credentials -&gt; API Key</strong>.</li>
                        <li>Skopírujte kľúč sem. (Na jeden účet môžete mať ~6000 vyhľadávaní mesačne zdarma).</li>
                    </ol>
                </div>

                {/* Importer */}
                <div className="bg-gray-50 rounded-3xl p-6 border-2 border-dashed border-gray-200 hover:border-indigo-300 transition-colors">
                    <h4 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-gray-400 mb-4">
                        <Plus className="w-4 h-4" /> Hromadný Import (Jeden na riadok)
                    </h4>
                    <textarea 
                        placeholder="AIzaSyD...&#10;AIzaSyX..."
                        value={importText}
                        onChange={e => setImportText(e.target.value)}
                        className="w-full min-h-[120px] bg-white border border-gray-200 rounded-2xl p-4 font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-y mb-4"
                    />
                    <div className="flex justify-end">
                        <button 
                            onClick={handleImport} 
                            disabled={isImporting || !importText.trim()}
                            className="bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg flex items-center gap-2 disabled:opacity-50 transition-all"
                        >
                            {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            Importovať a Overiť
                        </button>
                    </div>
                </div>

                {/* Keys List */}
                <div className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-gray-400">API Key</th>
                                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Usage (Month)</th>
                                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Akcie</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {keys.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-12 text-center text-sm text-gray-400 italic font-medium">
                                        Zatiaľ žiadne kľúče. Pridajte ich vyššie.
                                    </td>
                                </tr>
                            ) : (
                                keys.map((key) => (
                                    <tr key={key.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="py-4 px-6">
                                            {key.status === 'active' && <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-widest">Active</span>}
                                            {key.status === 'validating' && <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-widest animate-pulse">Checking...</span>}
                                            {key.status === 'error' && <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-700 text-[10px] font-black uppercase tracking-widest">Error</span>}
                                            {key.status === 'limit_reached' && <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest">Limit</span>}
                                        </td>
                                        <td className="py-4 px-6 font-mono text-xs text-gray-600 font-bold">
                                            {key.key.substring(0, 8)}...{key.key.substring(key.key.length - 6)}
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full transition-all ${key.usageMonth > key.usageLimit * 0.9 ? 'bg-red-500' : 'bg-indigo-500'}`} 
                                                        style={{ width: `${Math.min(100, (key.usageMonth / key.usageLimit) * 100)}%` }}
                                                    />
                                                </div>
                                                <span className="text-[10px] font-bold text-gray-500">
                                                    {key.usageMonth} / {key.usageLimit}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => resetUsage(key.id)}
                                                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                                    title="Reset Usage"
                                                >
                                                    <RefreshCw className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => deleteKey(key.id)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
