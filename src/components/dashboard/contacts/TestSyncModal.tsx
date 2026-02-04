'use client';

import * as React from 'react';
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
                    window.location.reload();
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
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="bg-background w-full max-w-md rounded-[2rem] shadow-2xl relative flex flex-col overflow-hidden border border-border">
                <div className="p-6 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FlaskConical className="w-5 h-5 text-amber-500" />
                        <h2 className="text-xl font-bold">Test Sync Update</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-6 space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Vyberte kontakt pre test synchronizácie. 
                        Meno zostane zachované, ale e-mail, telefón, firma a poznámka sa zaktualizujú testovacími dátami do Google Contacts.
                    </p>
                    
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Hľadať kontakt (meno, email, firma)..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
                        />
                    </div>
                    
                    <div className="space-y-2 max-h-[300px] overflow-y-auto thin-scrollbar pt-2">
                        {filtered.length === 0 && search && (
                            <p className="text-center text-xs text-muted-foreground py-10">Žiadne výsledky pre hľadanie</p>
                        )}
                        {filtered.map(contact => (
                            <button
                                key={contact.id}
                                onClick={() => handleTest(contact.id)}
                                disabled={isUpdating}
                                className="w-full p-4 rounded-2xl border border-border hover:bg-amber-50 dark:hover:bg-amber-900/10 hover:border-amber-200 transition-all flex items-center justify-between text-left group disabled:opacity-50"
                            >
                                <div>
                                    <p className="text-sm font-bold text-foreground">
                                        {contact.first_name} {contact.last_name || ''}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">
                                        {contact.company || 'Súkromný kontakt'}
                                    </p>
                                </div>
                                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 transition-all group-hover:scale-110">
                                    {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
