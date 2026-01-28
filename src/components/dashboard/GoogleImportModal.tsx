'use client';

import * as React from 'react';
import { X, Check, Loader2, RefreshCcw, UserPlus, Search, Info } from 'lucide-react';
import { toast } from 'sonner';

interface GoogleContact {
    name: string;
    email: string;
    phone: string;
    company: string;
}

export function GoogleImportModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [loading, setLoading] = React.useState(false);
    const [importing, setImporting] = React.useState<string | null>(null);
    const [contacts, setContacts] = React.useState<GoogleContact[]>([]);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [isConnected, setIsConnected] = React.useState(true);

    const fetchContacts = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/google/contacts');
            const data = await res.json();
            if (data.isConnected) {
                setContacts(data.contacts);
                setIsConnected(true);
            } else {
                setIsConnected(false);
            }
        } catch (error) {
            console.error('Failed to fetch Google contacts:', error);
            toast.error('Nepodarilo sa načítať kontakty');
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        if (isOpen) {
            fetchContacts();
        }
    }, [isOpen]);

    const handleImport = async (contact: GoogleContact) => {
        setImporting(contact.email);
        try {
            const [firstName, ...lastNameParts] = contact.name.split(' ');
            const lastName = lastNameParts.join(' ') || '-';

            const res = await fetch('/api/contacts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    first_name: firstName,
                    last_name: lastName,
                    email: contact.email,
                    phone: contact.phone,
                    company: contact.company,
                    status: 'published'
                })
            });

            if (res.ok) {
                toast.success(`Kontakt ${contact.name} bol importovaný`);
                // Optionally remove from list or mark as imported
                setContacts(prev => prev.filter(c => c.email !== contact.email));
            } else {
                const err = await res.json();
                toast.error(`Chyba: ${err.error || 'Nepodarilo sa importovať'}`);
            }
        } catch (error) {
            toast.error('Chyba pri komunikácii so serverom');
        } finally {
            setImporting(null);
        }
    };

    if (!isOpen) return null;

    const filtered = contacts.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="absolute inset-0" onClick={onClose}></div>

            <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden relative transform transition-all animate-in zoom-in-95 duration-500 border border-gray-100">
                {/* Header */}
                <div className="p-8 border-b border-gray-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
                            <RefreshCcw className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-gray-900 tracking-tight">Google Sync</h3>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Importujte kontakty z vášho ekosystému</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-xl shadow-sm border border-gray-100 transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-6 bg-gray-50/50 border-b border-gray-100">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Hľadať v Google kontaktoch..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                    {!isConnected ? (
                        <div className="text-center py-20 flex flex-col items-center">
                            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mb-4">
                                <Info className="w-8 h-8" />
                            </div>
                            <h4 className="text-lg font-black text-gray-900 mb-2">Google nie je prepojený</h4>
                            <p className="text-gray-500 text-sm max-w-xs mx-auto mb-6">Povolenie pre prístup ku kontaktom musíte udeliť v nastaveniach profilu (Clerk).</p>
                        </div>
                    ) : loading ? (
                        <div className="flex flex-col items-center justify-center py-32 gap-4">
                            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sťahujem dáta...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-20 text-gray-400 italic text-sm">
                            {searchQuery ? 'Nenašli sa žiadne výsledky' : 'Nenašli sa žiadne Google kontakty'}
                        </div>
                    ) : (
                        filtered.map((contact, idx) => (
                            <div
                                key={idx}
                                className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:border-blue-200 hover:shadow-md transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-sm font-bold text-gray-600 border border-gray-100">
                                        {contact.name[0].toUpperCase()}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-black text-gray-900 leading-none">{contact.name}</span>
                                        <span className="text-[11px] text-gray-400 font-medium mt-1">{contact.email}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleImport(contact)}
                                    disabled={!!importing}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-black hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                                >
                                    {importing === contact.email ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                        <UserPlus className="w-3 h-3" />
                                    )}
                                    {importing === contact.email ? 'Spracúvam' : 'Importovať'}
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <span>Celkom {filtered.length} kontaktov</span>
                    <button onClick={onClose} className="text-gray-900 hover:underline">Zavrieť</button>
                </div>
            </div>
        </div>
    );
}
