import React, { useState, useEffect } from 'react';
import { Trash2, AlertCircle, CheckCircle2, Loader2, Key, Plus, RefreshCw, ShieldAlert, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { verifyApiKey } from "@/app/actions/google-maps";
import { getApiKeys, saveApiKey, deleteApiKey } from '@/app/actions/google-maps-keys';

export interface ApiKey {
    id: string;
    key: string;
    label: string;
    status: 'active' | 'error' | 'limit_reached' | 'validating';
    usageMonth: number;
    usageToday: number;
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

    // Initial Load from DB
    useEffect(() => {
        loadKeys();
    }, []);

    const loadKeys = async () => {
        try {
            const data = await getApiKeys();
            const today = new Date().toISOString().split('T')[0];
            const processed = data?.map((k: ApiKey) => {
                 const lastUsedDay = k.lastUsed ? k.lastUsed.split('T')[0] : '';
                 if (lastUsedDay !== today) {
                     return { ...k, usageToday: 0 }; 
                 }
                 return k;
            }) || [];
            
            setKeys(processed);
            onKeysChange(processed);
            return processed;
        } catch (e) {
            console.error("Failed to load keys from DB", e);
            toast.error("Nepodarilo sa načítať API kľúče z databázy.");
            return [];
        }
    };

    const handleImport = async () => {
        if (!importText.trim()) return;
        setIsImporting(true);

        try {
            const lines = importText.split('\n').map(l => l.trim()).filter(l => l.length > 5);
            let importedCount = 0;

            for (const line of lines) {
                const parts = line.split(/[;,| ]+/).filter(Boolean);
                let keyStr = parts[0];
                let emailStr = parts.length > 1 ? parts[1] : undefined;

                if (keyStr.includes("=")) keyStr = keyStr.split("=")[1].trim();
                
                const label = emailStr || `Key ${keys.length + importedCount + 1}`;

                if (keyStr.length < 10) continue;
                if (keys.find(k => k.key === keyStr)) continue;

                const newKeyPayload: Partial<ApiKey> = {
                    key: keyStr,
                    label: label,
                    ownerEmail: emailStr || 'dev@arcigy.sk',
                    status: 'validating',
                    usageMonth: 0,
                    usageToday: 0,
                    usageLimit: 300, 
                    errorMessage: ''
                };
                
                const result = await saveApiKey(newKeyPayload);
                if (result.success) {
                    importedCount++;
                } else {
                    toast.error(`Chyba pri kľúči ${label}: ${result.error}`);
                }
            }

            if (importedCount === 0) {
                toast.warning("Neboli importované žiadne nové kľúče.");
            } else {
                toast.success(`Úspešne importovaných ${importedCount} kľúčov.`);
                setImportText('');
                // Wait for DB to settle and then reload and validate
                const freshKeys = await loadKeys();
                if (freshKeys.length > 0) {
                    await validateKeys(freshKeys);
                }
            }

        } catch (e) {
            console.error(e);
            toast.error("Import zlyhal.");
        } finally {
            setIsImporting(false);
        }
    };

    const validateKeys = async (keysToValidate: ApiKey[]) => {
        if (keysToValidate.length === 0) return;

        const validated = await Promise.all(keysToValidate.map(async (k) => {
            try {
                const result = await verifyApiKey(k.key); 
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

        setKeys(prev => {
            const newKeys = prev.map(p => {
                const v = validated.find(v => v.id === p.id);
                return v ? v : p;
            });
            onKeysChange(newKeys);
            return newKeys;
        });
    };

    const deleteKey = async (id: string) => {
        if (!confirm("Naozaj chcete odstrániť tento kľúč?")) return;
        
        try {
            await deleteApiKey(id);
            toast.success("Kľúč bol vymazaný.");
            await loadKeys();
        } catch (e) {
            toast.error("Chyba pri mazaní kľúča.");
        }
    };

    const revalidateKey = (key: ApiKey) => {
        validateKeys([key]);
    };

    const activeCount = keys.filter(k => k.status === 'active').length;
    const totalToday = keys.reduce((acc, k) => acc + (k.usageToday || 0), 0);
    const totalMonth = keys.reduce((acc, k) => acc + (k.usageMonth || 0), 0);
    const maxToday = keys.length * 300;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-3">
                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl">
                            <Key className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block">Aktívne kľúče</span>
                            <span className="text-xl font-black text-blue-900 leading-none">{activeCount} / {keys.length}</span>
                        </div>
                    </div>
                </div>
                <div className="bg-green-50/50 p-4 rounded-2xl border border-green-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-green-100 text-green-600 rounded-xl">
                            <RefreshCw className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-xs font-bold text-green-400 uppercase tracking-wider block">Dnešný náklad</span>
                            <span className="text-xl font-black text-green-900 leading-none">{totalToday} <span className="text-xs opacity-50 font-normal">req / {maxToday} max</span></span>
                        </div>
                    </div>
                </div>
                <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-orange-100 text-orange-600 rounded-xl">
                            <ShieldAlert className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-xs font-bold text-orange-400 uppercase tracking-wider block">Mesačný náklad</span>
                            <span className="text-xl font-black text-orange-900 leading-none">{totalMonth}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-200 shadow-sm">
                <h3 className="text-xs font-black text-gray-900 mb-4 flex items-center gap-2 uppercase tracking-widest">
                    <Plus className="w-4 h-4 text-blue-600" />
                    Hromadný import kľúčov
                </h3>
                <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder="AIza...&#10;AIza..., email@firma.sk"
                    className="w-full h-24 p-4 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-blue-500 bg-white font-mono text-xs mb-4"
                />
                <button
                    onClick={handleImport}
                    disabled={isImporting || !importText.trim()}
                    className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-black disabled:bg-gray-300 text-white font-bold py-4 px-4 rounded-2xl transition-all shadow-lg shadow-slate-950/20"
                >
                    {isImporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                    Spustiť import a overenie
                </button>
            </div>

            <div className="space-y-4">
                <h3 className="text-gray-900 font-bold flex items-center gap-2 px-1">
                    <KeyRound className="w-5 h-5 text-blue-500" />
                    Spravované kľúče
                </h3>
                {keys.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
                        <Key className="w-12 h-12 text-gray-200 mx-auto mb-3 opacity-20" />
                        <p className="text-gray-500 font-medium font-mono text-sm uppercase tracking-tighter">Prázdna databáza</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3">
                        {keys.map((key) => (
                            <div key={key.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xl shadow-blue-500/5 flex items-center justify-between group relative overflow-hidden">
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className={`p-3 rounded-2xl ${
                                        key.status === 'active' ? 'bg-green-50 text-green-600' :
                                        key.status === 'error' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600 shadow-lg shadow-blue-500/10'
                                    }`}>
                                        {key.status === 'active' ? <CheckCircle2 className="w-6 h-6" /> : 
                                         key.status === 'error' ? <AlertCircle className="w-6 h-6" /> : 
                                         <Loader2 className="w-6 h-6 animate-spin" />}
                                    </div>
                                    <div className="space-y-1">
                                        <div className="font-black text-gray-900 text-base leading-none break-all max-w-[200px]">
                                            {key.label}
                                        </div>
                                        <div className="text-[10px] font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100 w-fit">
                                            {key.key.substring(0, 10)}...{key.key.substring(key.key.length - 4)}
                                        </div>
                                        <div className="flex flex-col gap-1.5 mt-2">
                                            <div className="flex items-center justify-between min-w-[140px]">
                                                <span className="text-[10px] uppercase font-black text-gray-500 tracking-tighter">Dnešný náklad: {key.usageToday || 0} / 300</span>
                                                <span className="text-[10px] font-bold text-blue-600">{Math.round(((key.usageToday || 0)/300)*100)}%</span>
                                            </div>
                                            <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-200/50">
                                                <div 
                                                    className={`h-full rounded-full transition-all duration-1000 ${key.usageToday >= 250 ? 'bg-red-500' : 'bg-blue-600 shadow-sm shadow-blue-500/50'}`}
                                                    style={{ width: `${Math.min(100, ((key.usageToday || 0) / 300) * 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 relative z-10">
                                    <button 
                                        onClick={() => revalidateKey(key)}
                                        className="p-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all"
                                        title="Pre-overiť"
                                    >
                                        <RefreshCw className="w-5 h-5" />
                                    </button>
                                    <button 
                                        onClick={() => deleteKey(key.id)}
                                        className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"
                                        title="Vymazať"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                                
                                {/* Background Accent */}
                                <div className={`absolute -right-4 -bottom-4 w-24 h-24 blur-3xl opacity-5 rounded-full ${key.status === 'active' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
