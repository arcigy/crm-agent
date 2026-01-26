'use client';

import * as React from 'react';
import { Plus, Link as LinkIcon, Clock, Copy, Trash2, ExternalLink, Zap } from 'lucide-react';
import { toast } from 'sonner';

export default function BookingTool() {
    const [bookingTypes, setBookingTypes] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    const fetchBookingTypes = async () => {
        setLoading(true);
        try {
            // Placeholder: In real app this comes from Directus
            // I will simulate one for the demo
            setBookingTypes([
                { id: 1, name: 'Intro Stretnutie', slug: 'intro', duration: 30, active: true },
                { id: 2, name: 'Deep Dive Konzultácia', slug: 'consult', duration: 60, active: true }
            ]);
        } catch (error) {
            toast.error('Nepodarilo sa načítať typy stretnutí');
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchBookingTypes();
    }, []);

    const copyLink = (slug: string) => {
        const url = `${window.location.origin}/arcigy/${slug}`;
        navigator.clipboard.writeText(url);
        toast.success('Link skopírovaný!');
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic">
                        Booking / <span className="text-blue-600">Scheduler</span>
                    </h1>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mt-2 opacity-60">Custom scheduling infrastructure</p>
                </div>
                <button className="bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-xl active:scale-95 transition-all">
                    <Plus className="w-4 h-4" /> Vytvoriť typ linku
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {bookingTypes.map((type) => (
                    <div key={type.id} className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity -mr-16 -mt-16"></div>

                        <div className="flex items-start justify-between mb-8 relative z-10">
                            <div className="space-y-1">
                                <h3 className="text-2xl font-black text-gray-900 tracking-tight">{type.name}</h3>
                                <div className="flex items-center gap-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <Clock className="w-3 h-3" /> {type.duration} minút
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => copyLink(type.slug)}
                                    className="p-3 bg-gray-50 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm"
                                    title="Kopírovať link"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                                <a
                                    href={`/arcigy/${type.slug}`}
                                    target="_blank"
                                    className="p-3 bg-gray-50 hover:bg-black hover:text-white rounded-xl transition-all shadow-sm"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-6 border-t border-gray-50 relative z-10">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Aktívny link</span>
                            </div>
                            <button className="text-[9px] font-black text-red-400 uppercase tracking-widest hover:text-red-600 transition-colors flex items-center gap-1">
                                <Trash2 className="w-3 h-3" /> Vymazať
                            </button>
                        </div>
                    </div>
                ))}

                {/* Empty State / Add Card */}
                <button className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] p-8 flex flex-col items-center justify-center gap-4 hover:bg-blue-50 hover:border-blue-200 transition-all group">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-300 group-hover:bg-blue-600 group-hover:text-white shadow-sm transition-all">
                        <Plus className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest group-hover:text-blue-600">Pridať novú lekciu / slot</span>
                </button>
            </div>
        </div>
    );
}
