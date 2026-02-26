'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Lead } from '@/types/contact';
import { runTestSyncUpdate } from '@/app/actions/contacts';
import { toast } from 'sonner';
import { Search, Loader2, FlaskConical, X } from 'lucide-react';

export function TestSyncModal({ 
    isOpen, 
    onClose, 
    contacts 
}: { 
    isOpen: boolean, 
    onClose: () => void, 
    contacts: Lead[] 
}) {
    const router = useRouter();
    const [search, setSearch] = React.useState('');
    const [isUpdating, setIsUpdating] = React.useState(false);

    if (!isOpen) return null;

    const filtered = contacts.filter(c => 
        `${c.first_name || ''} ${c.last_name || ''} ${c.email || ''} ${c.company || ''}`
            .toLowerCase()
            .includes(search.toLowerCase())
    ).slice(0, 5);

    const handleTest = async (id: string | number) => {
        setIsUpdating(true);
        try {
            const res = await runTestSyncUpdate(id);
            const data = res as any;
            if (data.success) {
                if (data.sync) {
                    toast.success('CRM aj Google Contacts boli úspešne aktualizované!');
                    onClose();
                    router.refresh();
                } else {
                    toast.warning(`CRM OK, ale Google Sync zlyhal: ${data.syncError || 'Neznáma chyba'}`);
                }
            } else {
                toast.error(data.error || 'Test zlyhal');
            }
        } catch {
            toast.error('Chyba pri vykonávaní testu');
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
            <div className="bg-[#0a0a0c]/90 backdrop-blur-2xl w-full max-w-md rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative flex flex-col overflow-hidden border border-white/10">
                {/* Header */}
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                            <FlaskConical className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-[900] uppercase italic tracking-tight text-white leading-none">Diagnostic Test</h2>
                            <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mt-1">Sync Verification</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white hover:text-black border border-white/10 rounded-xl transition-all group"
                    >
                        <X className="w-5 h-5 transition-transform group-hover:rotate-90" />
                    </button>
                </div>
                
                <div className="p-8 space-y-6">
                    <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest leading-relaxed">
                        Vyberte kontakt pre test synchronizácie. 
                        Do Google Contacts sa odošlú testovacie dáta pre overenie prepojenia.
                    </p>
                    
                    <div className="relative group">
                        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-amber-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="Meno, email alebo firma..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/5 focus:border-amber-500/50 rounded-2xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-all font-bold placeholder:text-white/10 tracking-wider"
                        />
                    </div>
                    
                    <div className="space-y-2 max-h-[320px] overflow-y-auto pr-2 thin-scrollbar pt-2">
                        {filtered.length === 0 && search && (
                            <div className="py-12 text-center">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 italic">Žiadne výsledky</p>
                            </div>
                        )}
                        {filtered.map(contact => (
                            <button
                                key={contact.id}
                                onClick={() => handleTest(contact.id)}
                                disabled={isUpdating}
                                className="w-full p-4 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-amber-500/10 hover:border-amber-500/30 transition-all flex items-center justify-between text-left group disabled:opacity-50"
                            >
                                <div className="min-w-0">
                                    <p className="text-sm font-black text-white group-hover:text-amber-400 transition-colors truncate">
                                        {contact.first_name} {contact.last_name || ''}
                                    </p>
                                    <p className="text-[9px] text-white/30 uppercase font-black tracking-widest mt-1 truncate">
                                        {contact.company || 'Súkromný kontakt'}
                                    </p>
                                </div>
                                <div className="ml-4 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 transition-all group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-black">
                                    {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Footer status */}
                <div className="px-8 py-4 bg-white/5 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/20 italic">Diagnostic Mode</span>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-amber-500">System Ready</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
