'use client';

import * as React from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import { Lead } from '@/types/contact';
import { normalizeSlovakPhone } from '@/lib/phone';

interface CreateContactModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
    initialMode?: 'form' | 'json';
}

export function CreateContactModal({ isOpen, onClose, onSubmit, initialMode = 'form' }: CreateContactModalProps) {
    const [loading, setLoading] = React.useState(false);
    const [mode, setMode] = React.useState<'form' | 'json'>(initialMode);
    const [jsonInput, setJsonInput] = React.useState('');
    const [formData, setFormData] = React.useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        company: '',
        status: 'active'
    });

    React.useEffect(() => {
        if (isOpen) {
            setMode(initialMode);
            // Sync form to JSON when opening in RAW mode
            if (initialMode === 'json') {
                setJsonInput(JSON.stringify([formData], null, 4));
            }
        }
    }, [isOpen, initialMode]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (mode === 'json') {
                let parsed: any[] = [];
                try {
                    const possibleJson = JSON.parse(jsonInput);
                    parsed = Array.isArray(possibleJson) ? possibleJson : [possibleJson];
                } catch (err) {
                    alert('Neplatný formát JSON');
                    setLoading(false);
                    return;
                }

                const { bulkCreateContacts } = await import('@/app/actions/contacts');
                const normalizedParsed = parsed.map(c => ({
                    ...c,
                    phone: c.phone ? normalizeSlovakPhone(c.phone) : c.phone
                }));
                const res = await bulkCreateContacts(normalizedParsed);

                if (res.success) {
                    onClose();
                    window.location.reload();
                } else {
                    alert('Import zlyhal: ' + res.error);
                }
            } else {
                const normalizedData = {
                    ...formData,
                    phone: normalizeSlovakPhone(formData.phone)
                };
                const res = await onSubmit(normalizedData) as any;
                if (res?.success === false) {
                    alert('Chyba pri vytváraní: ' + (res.error || 'Neznáma chyba'));
                    setLoading(false);
                    return;
                }
                onClose();
                window.location.reload();
            }
        } catch (error: any) {
            console.error(error);
            alert('Chyba: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="absolute inset-0" onClick={onClose}></div>

            <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl p-10 relative transform transition-all animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 border border-gray-100">
                <button
                    onClick={onClose}
                    className="absolute top-8 right-8 p-2 text-gray-300 hover:text-gray-900 transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-blue-100">
                            <Plus className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">Nový kontakt</h2>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1 opacity-60">Add talent to your workspace</p>
                        </div>
                    </div>

                    <div className="flex bg-gray-50 rounded-2xl p-1 text-[10px] font-black uppercase tracking-widest border border-gray-100">
                        <button
                            type="button"
                            onClick={() => setMode('form')}
                            className={`px-6 py-3 rounded-xl transition-all ${mode === 'form' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-900'}`}
                        >
                            Formulár
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setJsonInput(JSON.stringify([formData], null, 4));
                                setMode('json');
                            }}
                            className={`px-6 py-3 rounded-xl transition-all ${mode === 'json' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-900'}`}
                        >
                            RAW
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {mode === 'form' ? (
                        <>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Meno</label>
                                    <input
                                        type="text"
                                        required
                                        autoFocus
                                        className="w-full h-16 bg-gray-50 border-2 border-gray-50 rounded-2xl px-6 text-lg font-bold focus:border-blue-500 focus:bg-white transition-all outline-none"
                                        value={formData.first_name}
                                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Priezvisko</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full h-16 bg-gray-50 border-2 border-gray-50 rounded-2xl px-6 text-lg font-bold focus:border-blue-500 focus:bg-white transition-all outline-none"
                                        value={formData.last_name}
                                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Email</label>
                                    <input
                                        type="email"
                                        required
                                        className="w-full h-14 bg-gray-50 border-2 border-gray-50 rounded-2xl px-5 font-bold text-sm focus:border-blue-500 focus:bg-white transition-all outline-none"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Telefón</label>
                                    <input
                                        type="text"
                                        className="w-full h-14 bg-gray-50 border-2 border-gray-50 rounded-2xl px-5 font-bold text-sm focus:border-blue-500 focus:bg-white transition-all outline-none"
                                        placeholder="+421 9xx xxx xxx"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Firma / Account</label>
                                <input
                                    type="text"
                                    className="w-full h-14 bg-gray-50 border-2 border-gray-50 rounded-2xl px-5 font-bold text-sm focus:border-blue-500 focus:bg-white transition-all outline-none"
                                    value={formData.company}
                                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Status kontaktu</label>
                                <select
                                    className="w-full h-14 bg-gray-50 border-2 border-gray-50 rounded-2xl px-5 font-bold text-sm focus:border-blue-500 focus:bg-white transition-all outline-none appearance-none"
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                >
                                    <option value="active">🟢 Active Participant</option>
                                    <option value="lead">🟡 New Lead</option>
                                </select>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-4">
                            <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Systémová pamäť (JSON Protocol)</label>
                            <div className="bg-gray-900 rounded-[2rem] p-6 mb-2 border border-blue-500/20 shadow-2xl overflow-hidden relative group/code">
                                <code className="text-[10px] text-blue-400 font-black uppercase tracking-widest block italic opacity-60">Engine Protocol Input:</code>
                                <p className="text-[10px] text-gray-500 font-mono mt-2 leading-relaxed">
                                    Vložte pole objektov s kľúčmi: first_name, last_name, email, phone, company.
                                </p>
                            </div>
                            <textarea
                                className="w-full h-72 font-mono text-xs p-6 bg-gray-50 border-2 border-gray-50 rounded-[2rem] focus:border-blue-500 focus:bg-white transition-all outline-none resize-none shadow-inner"
                                placeholder='Insert system memory...'
                                value={jsonInput}
                                onChange={(e) => setJsonInput(e.target.value)}
                            ></textarea>
                        </div>
                    )}

                    <div className="pt-6">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-20 bg-gray-900 text-white rounded-[2rem] text-sm font-black uppercase tracking-[0.4em] flex items-center justify-center gap-3 shadow-2xl shadow-gray-200 hover:bg-black transition-all active:scale-95 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (mode === 'json' ? 'Importovať Protokol' : 'Vytvoriť Záznam')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
