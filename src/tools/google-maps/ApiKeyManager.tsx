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
        } catch (e) {
            console.error("Failed to load keys from DB", e);
            toast.error("Nepodarilo sa načítať API kľúče z databázy.");
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
                
                const label = emailStr ? `Key (${emailStr.split('@')[0]})` : `Key ${keys.length + importedCount + 1}`;

                if (keyStr.length < 10) continue;
                if (keys.find(k => k.key === keyStr)) continue;

                const newKey: Partial<ApiKey> = {
                    key: keyStr,
                    label: label,
                    ownerEmail: emailStr || 'Neznámy (Unknown)',
                    status: 'validating',
                    usageMonth: 0,
                    usageToday: 0,
                    usageLimit: 300, 
                    errorMessage: ''
                };
                
                const result = await saveApiKey(newKey);
                if (result.success) {
                    importedCount++;
                } else {
                    toast.error(`Chyba pri kľúči ${label}: ${result.error}`);
                }
            }

            if (importedCount === 0) {
                toast.warning("Neboli importované žiadne nové kľúče.");
            } else {
                toast.success(`Úspešne importovaných ${importedCount} kľúčov do DB.`);
                loadKeys(); 
                setImportText('');
            }

        } catch (e) {
            console.error(e);
            toast.error("Import failed.");
        } finally {
            setIsImporting(false);
        }
    };

    const validateKeys = async (keysToValidate: ApiKey[]) => {
        setKeys(prev => prev.map(p => keysToValidate.find(k => k.id === p.id) ? { ...p, status: 'validating' } : p));

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

        setKeys(prev => prev.map(p => {
            const v = validated.find(v => v.id === p.id);
            return v ? v : p;
        }));
    };

    const deleteKey = async (id: string) => {
        if (!confirm("Naozaj chcete odstrániť tento kľúč?")) return;
        
        try {
            await deleteApiKey(id);
            toast.success("Key removed from DB.");
            loadKeys();
        } catch (e) {
            toast.error("Failed to delete key.");
        }
    };

    const revalidateKey = (key: ApiKey) => {
        validateKeys([key]);
    };

    const activeCount = keys.filter(k => k.status === 'active').length;
    const totalToday = keys.reduce((acc, k) => acc + (k.usageToday || 0), 0);
    const totalMonth = keys.reduce((acc, k) => acc + (k.usageMonth || 0), 0);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-3">
                <div className="bg-blue-50/50 p-3 rounded-2xl border border-blue-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                            <Key className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold text-blue-900">Aktívne kľúče</span>
                    </div>
                    <div className="text-lg font-black text-blue-700">{activeCount} / {keys.length}</div>
                </div>
                <div className="bg-green-50/50 p-3 rounded-2xl border border-green-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 text-green-600 rounded-xl">
                            <RefreshCw className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold text-green-900">Dnešný náklad</span>
                    </div>
                    <div className="text-lg font-black text-green-700">{totalToday} <span className="text-[10px] font-normal opacity-60">req</span></div>
                </div>
                <div className="bg-orange-50/50 p-3 rounded-2xl border border-orange-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
                            <ShieldAlert className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold text-orange-900">Mesačný náklad</span>
                    </div>
                    <div className="text-lg font-black text-orange-700">{totalMonth}</div>
                </div>
            </div>

            <div className="bg-gray-50 p-5 rounded-3xl border border-gray-200">
                <h3 className="text-sm font-black text-gray-900 mb-3 flex items-center gap-2 uppercase tracking-widest">
                    <Plus className="w-4 h-4 text-blue-600" />
                    Hromadný import
                </h3>
                <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder="AIza...&#10;AIza..., email@firma.sk"
                    className="w-full h-24 p-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-blue-500 bg-white font-mono text-xs mb-3"
                />
                <button
                    onClick={handleImport}
                    disabled={isImporting || !importText.trim()}
                    className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-black disabled:bg-gray-300 text-white font-bold py-3 px-4 rounded-2xl transition-all text-sm"
                >
                    {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Importovať kľúče
                </button>
            </div>

            <div className="space-y-4">
                <h3 className="text-gray-900 font-bold flex items-center gap-2 px-1">
                    <KeyRound className="w-5 h-5 text-blue-500" />
                    Spravované kľúče
                </h3>
                {keys.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
                        <Key className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">Zatiaľ nemáte žiadne kľúče.</p>
                        <p className="text-sm text-gray-400">Pridajte ich pomocou importu vyššie.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3">
                        {keys.map((key) => (
                            <div key={key.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-lg ${
                                        key.status === 'active' ? 'bg-green-50 text-green-600' :
                                        key.status === 'error' ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-600'
                                    }`}>
                                        {key.status === 'active' ? <CheckCircle2 className="w-5 h-5" /> : 
                                         key.status === 'error' ? <AlertCircle className="w-5 h-5" /> : 
                                         <Loader2 className="w-5 h-5 animate-spin" />}
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-900 flex items-center gap-2">
                                            {key.label}
                                            {key.ownerEmail && <span className="text-xs font-normal text-gray-400">({key.ownerEmail})</span>}
                                        </div>
                                        <div className="text-xs font-mono text-gray-400 mt-0.5">
                                            {key.key.substring(0, 10)}...{key.key.substring(key.key.length - 4)}
                                        </div>
                                        <div className="flex items-center gap-3 mt-1.5">
                                            <span className="text-[10px] uppercase font-bold text-gray-400">Usage Today: {key.usageToday || 0}/300</span>
                                            <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full ${key.usageToday >= 250 ? 'bg-orange-500' : 'bg-blue-500'}`}
                                                    style={{ width: `${Math.min(100, (key.usageToday / 300) * 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => revalidateKey(key)}
                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Re-validate"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => deleteKey(key.id)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
