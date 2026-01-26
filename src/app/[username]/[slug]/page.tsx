'use client';

import * as React from 'react';
import { format, addDays, startOfToday, isSameDay } from 'date-fns';
import { sk } from 'date-fns/locale';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, CheckCircle, Mail, User } from 'lucide-react';
import { toast } from 'sonner';

export default function PublicBookingPage({ params }: { params: { username: string, slug: string } }) {
    const [selectedDate, setSelectedDate] = React.useState(startOfToday());
    const [slots, setSlots] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [selectedSlot, setSelectedSlot] = React.useState<any>(null);
    const [step, setStep] = React.useState<'date' | 'details' | 'success'>('date');

    const [clientName, setClientName] = React.useState('');
    const [clientEmail, setClientEmail] = React.useState('');

    // Days for the week selector
    const weekDays = Array.from({ length: 14 }, (_, i) => addDays(startOfToday(), i));

    const fetchSlots = async (date: Date) => {
        setLoading(true);
        try {
            const dateStr = format(date, 'yyyy-MM-dd');
            const res = await fetch(`/api/booking/available?date=${dateStr}&slug=${params.slug}`);
            const data = await res.json();
            setSlots(data.slots || []);
        } catch (error) {
            toast.error('Nepodarilo sa načítať voľné termíny');
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchSlots(selectedDate);
    }, [selectedDate]);

    const handleBooking = async () => {
        if (!clientName || !clientEmail) {
            toast.error('Prosím vyplňte všetky údaje');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/booking/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    slug: params.slug,
                    username: params.username,
                    start: selectedSlot.start,
                    end: selectedSlot.end,
                    name: clientName,
                    email: clientEmail
                })
            });

            if (res.ok) {
                setStep('success');
            } else {
                toast.error('Chyba pri vytváraní rezervácie');
            }
        } catch (error) {
            toast.error('Systémová chyba');
        } finally {
            setLoading(false);
        }
    };

    if (step === 'success') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-900">
                <div className="bg-white rounded-[3rem] shadow-2xl p-12 max-w-lg w-full text-center space-y-8 animate-in zoom-in-95 duration-500">
                    <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-100">
                        <CheckCircle className="w-12 h-12" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-3xl font-black tracking-tight">Stretnutie potvrdené!</h1>
                        <p className="text-slate-500 font-medium">Pozvánka bola odoslaná na váš e-mail {clientEmail}.</p>
                    </div>
                    <div className="bg-slate-50 rounded-3xl p-6 text-sm flex flex-col gap-3 font-bold">
                        <div className="flex items-center gap-3">
                            <CalendarIcon className="w-4 h-4 text-slate-400" />
                            {format(new Date(selectedSlot.start), 'd. MMMM yyyy', { locale: sk })}
                        </div>
                        <div className="flex items-center gap-3">
                            <Clock className="w-4 h-4 text-slate-400" />
                            {format(new Date(selectedSlot.start), 'HH:mm')} - {format(new Date(selectedSlot.end), 'HH:mm')}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fcfcfd] flex items-center justify-center p-4 lg:p-24 font-sans selection:bg-blue-100">
            <div className="bg-white rounded-[2.5rem] lg:rounded-[4rem] shadow-[0_80px_160px_rgba(0,0,0,0.08)] border border-gray-100 w-full max-w-6xl flex flex-col lg:flex-row overflow-hidden relative group">
                {/* Left Sidebar (Info) */}
                <div className="lg:w-1/3 bg-slate-900 p-12 text-white relative flex flex-col justify-between overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-[120px] opacity-20 -mr-20 -mt-20"></div>

                    <div className="relative z-10 space-y-8">
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">Powered by CRM</span>
                        </div>
                        <div className="space-y-4">
                            <h2 className="text-sm font-black uppercase tracking-[0.4em] text-slate-500 italic opacity-80">Booking session</h2>
                            <h1 className="text-4xl lg:text-5xl font-black tracking-tighter leading-none mb-6">
                                {params.slug.replace(/-/g, ' ')}
                            </h1>
                            <div className="flex items-center gap-3 text-slate-400 font-bold uppercase tracking-widest text-xs">
                                <Clock className="w-4 h-4" /> 30 minút
                            </div>
                        </div>
                    </div>

                    <div className="mt-20 pt-12 border-t border-slate-800 space-y-6">
                        <p className="text-slate-400 text-sm leading-relaxed font-medium">
                            Vyberte si čas, ktorý vám vyhovuje. Po potvrdení dostanete detaily stretnutia do vášho kalendára.
                        </p>
                    </div>
                </div>

                {/* Right Content */}
                <div className="lg:w-2/3 p-8 lg:p-16 flex flex-col bg-white">
                    {step === 'date' ? (
                        <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-10 duration-500">
                            <div className="flex items-center justify-between mb-12">
                                <h3 className="text-3xl font-black text-slate-900 tracking-tight">Vyberte termín</h3>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{format(selectedDate, 'LLLL yyyy', { locale: sk })}</div>
                            </div>

                            {/* Date Selector */}
                            <div className="flex gap-4 overflow-x-auto pb-6 -mx-2 px-2 no-scrollbar">
                                {weekDays.map((day) => {
                                    const isSelected = isSameDay(day, selectedDate);
                                    return (
                                        <button
                                            key={day.toString()}
                                            onClick={() => setSelectedDate(day)}
                                            className={`flex flex-col items-center justify-center min-w-[70px] h-24 rounded-3xl transition-all border shrink-0
                                                ${isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-100 scale-105' : 'bg-white border-gray-100 text-slate-900 hover:border-blue-200'}
                                            `}
                                        >
                                            <span className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">{format(day, 'EEE', { locale: sk })}</span>
                                            <span className="text-2xl font-black">{format(day, 'd')}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Slot Selector */}
                            <div className="flex-1 mt-8">
                                {loading ? (
                                    <div className="flex items-center justify-center h-48">
                                        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                ) : slots.filter(s => s.available).length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-48 text-slate-400 opacity-60 space-y-4">
                                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center italic text-xl">☕</div>
                                        <p className="font-black uppercase tracking-widest text-[10px] italic underline">Žiadne voľné časy pre tento deň</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                                        {slots.filter(s => s.available).map((slot, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    setSelectedSlot(slot);
                                                    setStep('details');
                                                }}
                                                className="py-4 bg-gray-50 hover:bg-black hover:text-white rounded-2xl font-black text-sm transition-all active:scale-95 border border-transparent hover:shadow-xl shadow-gray-200"
                                            >
                                                {format(new Date(slot.start), 'HH:mm')}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-10 duration-500">
                            <button
                                onClick={() => setStep('date')}
                                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-900 mb-8 transition-colors group"
                            >
                                <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Späť na výber času
                            </button>

                            <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-4">Vaše údaje</h3>
                            <p className="text-slate-500 mb-12 font-medium">Povedzte nám pár informácií pre dokončenie rezervácie.</p>

                            <div className="space-y-6 max-w-md">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Vaše celé meno</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                        <input
                                            type="text"
                                            placeholder="Ján Novák"
                                            className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold focus:bg-white focus:border-blue-500 outline-none transition-all shadow-sm"
                                            value={clientName}
                                            onChange={(e) => setClientName(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Váš e-mail</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                        <input
                                            type="email"
                                            placeholder="meno@firma.sk"
                                            className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold focus:bg-white focus:border-blue-500 outline-none transition-all shadow-sm"
                                            value={clientEmail}
                                            onChange={(e) => setClientEmail(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="pt-8">
                                    <button
                                        onClick={handleBooking}
                                        disabled={loading}
                                        className="w-full py-5 bg-blue-600 hover:bg-black text-white rounded-[1.5rem] font-black uppercase tracking-widest shadow-2xl shadow-blue-100 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                                    >
                                        {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : (
                                            <>Potvrdiť stretnutie <ChevronRight className="w-5 h-5" /></>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
