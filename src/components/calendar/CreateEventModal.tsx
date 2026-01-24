'use client';

import * as React from 'react';
import { X, Calendar as CalendarIcon, Clock, MapPin, AlignLeft, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { createCalendarEvent } from '@/app/actions/calendar';

interface CreateEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialDate?: Date;
}

export function CreateEventModal({ isOpen, onClose, onSuccess, initialDate }: CreateEventModalProps) {
    const [loading, setLoading] = React.useState(false);
    const [formData, setFormData] = React.useState({
        summary: '',
        description: '',
        location: '',
        startDate: initialDate ? format(initialDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
        startTime: '10:00',
        endDate: initialDate ? format(initialDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
        endTime: '11:00',
    });

    React.useEffect(() => {
        if (initialDate) {
            const dateStr = format(initialDate, "yyyy-MM-dd");
            setFormData(prev => ({ ...prev, startDate: dateStr, endDate: dateStr }));
        }
    }, [initialDate]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const startDateTime = new Date(`${formData.startDate}T${formData.startTime}:00`).toISOString();
        const endDateTime = new Date(`${formData.endDate}T${formData.endTime}:00`).toISOString();

        try {
            const result = await createCalendarEvent({
                summary: formData.summary,
                description: formData.description,
                location: formData.location,
                start: startDateTime,
                end: endDateTime,
            });

            if (result.success) {
                toast.success('Udalosť bola vytvorená');
                onSuccess();
                onClose();
                setFormData({
                    summary: '',
                    description: '',
                    location: '',
                    startDate: format(new Date(), "yyyy-MM-dd"),
                    startTime: '10:00',
                    endDate: format(new Date(), "yyyy-MM-dd"),
                    endTime: '11:00',
                });
            } else {
                toast.error(result.error || 'Nepodarilo sa vytvoriť udalosť');
            }
        } catch (error) {
            toast.error('Systémová chyba pri vytváraní udalosti');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />

            <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl relative flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
                            <CalendarIcon className="w-5 h-5 text-white" />
                        </div>
                        <h2 className="text-xl font-black text-gray-900 tracking-tight">Nová udalosť</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="w-6 h-6 text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block px-1">Názov udalosti</label>
                            <input
                                required
                                type="text"
                                placeholder="Napr. Stretnutie s klientom"
                                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 outline-none transition-all font-bold text-gray-900 placeholder:font-medium placeholder:text-gray-300"
                                value={formData.summary}
                                onChange={e => setFormData({ ...formData, summary: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block px-1">Začiatok</label>
                                <div className="space-y-2">
                                    <input
                                        type="date"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:bg-white outline-none"
                                        value={formData.startDate}
                                        onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                    />
                                    <input
                                        type="time"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:bg-white outline-none"
                                        value={formData.startTime}
                                        onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block px-1">Koniec</label>
                                <div className="space-y-2">
                                    <input
                                        type="date"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:bg-white outline-none"
                                        value={formData.endDate}
                                        onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                    />
                                    <input
                                        type="time"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:bg-white outline-none"
                                        value={formData.endTime}
                                        onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block px-1">Lokalita (voliteľné)</label>
                            <div className="relative">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                <input
                                    type="text"
                                    placeholder="Napr. Google Meet, Bratislava..."
                                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-12 pr-5 py-3 text-sm focus:bg-white outline-none"
                                    value={formData.location}
                                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block px-1">Popis</label>
                            <div className="relative">
                                <AlignLeft className="absolute left-4 top-4 w-4 h-4 text-gray-300" />
                                <textarea
                                    rows={3}
                                    placeholder="Detaily udalosti..."
                                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-12 pr-5 py-3 text-sm focus:bg-white outline-none resize-none"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 text-sm font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            Zrušiť
                        </button>
                        <button
                            disabled={loading}
                            type="submit"
                            className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-4 font-black uppercase tracking-widest shadow-xl shadow-blue-100 disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Vytvoriť udalosť'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
