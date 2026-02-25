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
    const [phonePrefix, setPhonePrefix] = React.useState('+421');
    const [formData, setFormData] = React.useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        company: '',
        status: 'active'
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const finalPhone = formData.phone.trim() 
                ? (formData.phone.startsWith('+') || formData.phone.startsWith('00') || !phonePrefix 
                    ? formData.phone 
                    : `${phonePrefix} ${formData.phone}`)
                : '';
                
            const normalizedData = {
                ...formData,
                phone: normalizeSlovakPhone(finalPhone)
            };
            const res = await onSubmit(normalizedData) as any;
            if (res?.success === false) {
                alert('Chyba pri vytváraní: ' + (res.error || 'Neznáma chyba'));
                setLoading(false);
                return;
            }
            onClose();
            window.location.reload();
        } catch (error: any) {
            console.error(error);
            alert('Chyba: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="absolute inset-0" onClick={onClose}></div>

            <div className="bg-[#0a0a0e] rounded-3xl shadow-2xl shadow-violet-900/20 w-full max-w-lg p-8 relative transform transition-all animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 border border-violet-900/30">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-3 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all rounded-full border border-white/5 z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex items-center justify-between mb-10 pr-12">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-violet-900/40 relative">
                            <Plus className="w-6 h-6 relative z-10" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">Nový kontakt</h2>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-white/50 ml-1">Meno</label>
                                    <input
                                        type="text"
                                        required
                                        autoFocus
                                        className="w-full h-14 bg-black/40 border border-white/10 rounded-xl px-5 text-[15px] text-white font-bold focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/60 transition-all outline-none placeholder:text-white/20"
                                        value={formData.first_name}
                                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-white/50 ml-1">Priezvisko</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full h-14 bg-black/40 border border-white/10 rounded-xl px-5 text-[15px] text-white font-bold focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/60 transition-all outline-none placeholder:text-white/20"
                                        value={formData.last_name}
                                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-white/50 ml-1">Email</label>
                                    <input
                                        type="email"
                                        required
                                        className="w-full h-14 bg-black/40 border border-white/10 rounded-xl px-5 text-[14px] text-white font-medium focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/60 transition-all outline-none placeholder:text-white/20"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-white/50 ml-1">Telefón</label>
                                    <div className="flex bg-black/40 border border-white/10 rounded-xl focus-within:border-violet-500/60 focus-within:ring-1 focus-within:ring-violet-500/60 transition-all overflow-hidden h-14">
                                        <select
                                            className="w-[72px] bg-transparent text-[14px] text-white/70 font-medium outline-none appearance-none text-center cursor-pointer border-r border-white/10 shrink-0"
                                            value={phonePrefix}
                                            onChange={(e) => setPhonePrefix(e.target.value)}
                                        >
                                            <option value="">-</option>
                                            <option value="+421">+421</option>
                                            <option value="+420">+420</option>
                                        </select>
                                        <input
                                            type="text"
                                            className="flex-1 bg-transparent px-5 text-[14px] text-white font-medium outline-none placeholder:text-white/20 min-w-0"
                                            placeholder="9xx xxx xxx"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-white/50 ml-1">Firma / Account</label>
                                <input
                                    type="text"
                                    className="w-full h-14 bg-black/40 border border-white/10 rounded-xl px-5 text-[14px] text-white font-medium focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/60 transition-all outline-none placeholder:text-white/20"
                                    value={formData.company}
                                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-white/50 ml-1">Status kontaktu</label>
                                <select
                                    className="w-full h-14 bg-black/40 border border-white/10 rounded-xl px-5 text-[14px] text-white font-bold focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/60 transition-all outline-none appearance-none"
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                >
                                    <option value="active">🟢 Známy Kontakt</option>
                                    <option value="lead">🟡 Nový Lead</option>
                                </select>
                            </div>

                    <div className="pt-6">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-16 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-[13px] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-violet-900/40 hover:from-violet-500 hover:to-indigo-500 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Uložiť Záznam'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
