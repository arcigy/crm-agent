
import React, { useState, useEffect } from 'react';
import { Trash2, AlertCircle, CheckCircle2, Loader2, Key, Plus, RefreshCw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { verifyApiKey } from "@/app/actions/google-maps";

export interface ApiKey {
    id: string;
    key: string;
    label: string;
    status: 'active' | 'error' | 'limit_reached' | 'validating';
    usageMonth: number;
    usageLimit: number;
    ownerEmail?: string;
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
                // Parse: "KEY, email" or just "KEY"
                // Split by comma, semicolon or pipe
                const parts = line.split(/[;,| ]+/).filter(Boolean);
                let keyStr = parts[0];
                let emailStr = parts.length > 1 ? parts[1] : undefined;

                // Basic cleanup if user pastes "KEY=AIza..."
                if (keyStr.includes("=")) keyStr = keyStr.split("=")[1].trim();
                
                let label = emailStr ? `Key (${emailStr.split('@')[0]})` : `Key ${keys.length + newKeys.length + 1}`;

                if (keyStr.length < 10) continue;
                if (keys.find(k => k.key === keyStr) || newKeys.find(k => k.key === keyStr)) continue;

                newKeys.push({
                    id: crypto.randomUUID(),
                    key: keyStr,
                    label: label,
                    ownerEmail: emailStr || 'Neznámy (Unknown)',
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
        // Validation simulation -> REAL API CHECK
        setKeys(prev => prev.map(p => keysToValidate.find(k => k.id === p.id) ? { ...p, status: 'validating' } : p));

        const validated = await Promise.all(keysToValidate.map(async (k) => {
            try {
                // Skutočný test na serveri
                const result = await verifyApiKey(k.key); // Server Action
                return {
                    ...k,
                    status: result.isValid ? 'active' : 'error',
                    errorMessage: result.isValid ? undefined : (result.error || 'Invalid API Key')
                } as ApiKey;
            } catch (err: any) {
                return {
                    ...k,
                    status: 'error',
                    errorMessage: err.message || 'Validation failed'
                } as ApiKey;
            }
        }));

        setKeys(prev => prev.map(p => {
            const v = validated.find(v => v.id === p.id);
            return v ? v : p;
        }));
    };

    const deleteKey = (id: string) => {
        if (!confirm("Naozaj chcete odstrániť tento kľúč?")) return;
        setKeys(prev => prev.filter(k => k.id !== id));
        toast.success("Key removed.");
    };

    const revalidateKey = (key: ApiKey) => {
        validateKeys([key]);
        toast.info("Validation started...");
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
                        <li>Vytvorte nový projekt (máte <strong>$200 kredit, ktorý sa obnovuje každý mesiac</strong>).</li>
                        <li>Chodťe do <strong>Library</strong> a povoľte <strong>"Places API (New)"</strong>.</li>
                        <li>Chodťe do <strong>Credentials</strong> a kliknite <strong>Create Credentials -&gt; API Key</strong>.</li>
                        <li>Skopírujte kľúč sem. (Formát: <span className="font-mono bg-blue-100 px-1 rounded">KĽÚČ, email@gmail.com</span>)</li>
                    </ol>
                </div>

                {/* Importer */}
                <div className="bg-gray-50 rounded-3xl p-6 border-2 border-dashed border-gray-200 hover:border-indigo-300 transition-colors">
                    <h4 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-gray-400 mb-4">
                        <Plus className="w-4 h-4" /> Import Kľúčov + Emailov
                    </h4>
                    <textarea 
                        placeholder="AIzaSy...Kluc1, user1@gmail.com&#10;AIzaSy...Kluc2, user2@gmail.com"
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
                            Importovať a označiť
                        </button>
                    </div>
                </div>

                {/* Keys List */}
                <div className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[600px]">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-gray-400 whitespace-nowrap">Status</th>
                                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-gray-400 whitespace-nowrap">Vlastník</th>
                                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-gray-400 whitespace-nowrap">API Key</th>
                                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-gray-400 whitespace-nowrap">Usage</th>
                                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right whitespace-nowrap">Akcie</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {keys.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-sm text-gray-400 italic font-medium">
                                            Zatiaľ žiadne kľúče. Pridajte ich vyššie v tvare "Kľúč, Email".
                                        </td>
                                    </tr>
                                ) : (
                                    keys.map((key) => (
                                        <tr key={key.id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="py-4 px-6 whitespace-nowrap">
                                                {key.status === 'active' && <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-widest">Active</span>}
                                                {key.status === 'validating' && <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-widest animate-pulse">Checking</span>}
                                                {key.status === 'error' && <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-700 text-[10px] font-black uppercase tracking-widest">Error</span>}
                                                {key.status === 'limit_reached' && <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest">Limit</span>}
                                            </td>
                                            <td className="py-4 px-6 text-xs text-gray-900 font-bold whitespace-nowrap max-w-[150px] truncate" title={key.ownerEmail}>
                                                {key.ownerEmail || 'Unknown'}
                                            </td>
                                            <td className="py-4 px-6 font-mono text-xs text-gray-500 font-bold whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <span className="bg-gray-100 px-2 py-1 rounded-md border border-gray-200">
                                                        {key.key.length > 10 ? `${key.key.substring(0, 4)}...${key.key.substring(key.key.length - 4)}` : 'Invalid'}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400">🔒</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full rounded-full transition-all ${key.usageMonth > key.usageLimit * 0.9 ? 'bg-red-500' : 'bg-indigo-500'}`} 
                                                            style={{ width: `${Math.min(100, (key.usageMonth / key.usageLimit) * 100)}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-gray-500 w-12 text-right">
                                                        {((key.usageMonth / key.usageLimit) * 100).toFixed(0)}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button 
                                                        onClick={() => revalidateKey(key)}
                                                        className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-transparent hover:border-indigo-100"
                                                        title="Re-validate & Check Status"
                                                    >
                                                        <RefreshCw className={`w-4 h-4 ${key.status === 'validating' ? 'animate-spin' : ''}`} />
                                                    </button>
                                                    <button 
                                                        onClick={() => deleteKey(key.id)}
                                                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100 bg-red-50/50"
                                                        title="Delete Key"
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
        </div>
    );
}
