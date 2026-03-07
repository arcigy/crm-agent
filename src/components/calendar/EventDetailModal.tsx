'use client';

import * as React from 'react';
import { X, Calendar, Clock, MapPin, AlignLeft, User, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { sk } from 'date-fns/locale';
import { CalendarEvent } from '@/types/calendar';

interface EventDetailModalProps {
    event: CalendarEvent | null;
    isOpen: boolean;
    onClose: () => void;
    onOpenContact?: (contact: any) => void;
    onSuccess?: () => void;
}

import { deleteCalendarEvent } from '@/app/actions/calendar/mutate';
import { toast } from 'sonner';
import { Loader2, Trash2 } from 'lucide-react';

export function EventDetailModal({ event, isOpen, onClose, onOpenContact, onSuccess }: EventDetailModalProps) {
    const [isDeleting, setIsDeleting] = React.useState(false);
    
    if (!isOpen || !event) return null;

    const handleDelete = async () => {
        if (!event.id || isProject) return;
        
        if (!confirm('Naozaj chcete vymazať túto poznámku?')) return;
        
        setIsDeleting(true);
        try {
            const res = await deleteCalendarEvent(event.id);
            if (res.success) {
                toast.success('Poznámka bola vymazaná');
                onSuccess?.();
                onClose();
            } else {
                toast.error(res.error || 'Nepodarilo sa vymazať poznámku');
            }
        } catch (error) {
            toast.error('Systémová chyba pri mazaní');
        } finally {
            setIsDeleting(false);
        }
    };

    const isProject = event.id.startsWith('p-');

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-500" onClick={onClose} />

            <div className={`bg-[#050507]/95 backdrop-blur-3xl w-full max-w-lg rounded-[2.5rem] shadow-[0_25px_80px_rgba(0,0,0,0.8),0_0_50px_rgba(124,58,237,0.05)] relative flex flex-col overflow-hidden animate-in zoom-in-95 duration-500 border border-white/[0.05]`}>
                {/* Header Decoration */}
                <div className={`h-2 w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-[0_5px_15px_rgba(139,92,246,0.3)]`} />

                <div className="p-10">
                    <div className="flex items-start justify-between mb-10">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-4">
                                <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] italic border border-white/5 bg-white/5 text-zinc-500 shadow-[0_0_15px_rgba(255,255,255,0.02)]
                                    `}>
                                    {isProject ? 'STRATEGICKÝ PROJEKT' : 'POZNÁMKA V KALENDÁRI'}
                                </span>
                            </div>
                            <h2 className="text-3xl font-black text-white italic leading-none tracking-tighter uppercase">
                                {event.title}
                            </h2>
                        </div>
                        <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-2xl transition-all shrink-0 group">
                            <X className="w-6 h-6 text-zinc-500 group-hover:text-white transition-colors" />
                        </button>
                    </div>

                    <div className="space-y-8">
                        {/* Time & Date */}
                        <div className="flex items-center gap-8 p-6 bg-white/[0.02] rounded-[2rem] border border-white/5 shadow-inner group/date relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover/date:opacity-100 transition-opacity" />
                            <div className="bg-violet-500/10 p-4 rounded-2xl shadow-xl relative z-10 border border-violet-500/20 group-hover/date:scale-110 transition-transform">
                                <Calendar className="w-6 h-6 text-violet-500" />
                            </div>
                            <div className="relative z-10">
                                <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em] italic mb-2">Naplánované na</p>
                                <p className="text-white font-black italic text-lg tracking-tight">
                                    {format(event.start, 'd. MMMM yyyy', { locale: sk })}
                                </p>
                                {!event.allDay && (
                                    <div className="text-violet-400 text-[11px] font-black uppercase tracking-widest flex items-center gap-2 mt-2 italic">
                                        <Clock className="w-4 h-4" />
                                        <span>{format(event.start, 'HH:mm')}</span>
                                        <div className="w-3 h-[1px] bg-violet-500/30" />
                                        <span>{format(event.end, 'HH:mm')}</span>
                                    </div>
                                )}
                                {event.allDay && <p className="text-amber-500 text-[10px] font-black uppercase tracking-[0.2em] mt-2 italic">Celodenná Aktivita</p>}
                            </div>
                        </div>

                        {/* Location */}
                        {event.location && (
                            <div className="flex items-start gap-6 px-4 group/loc">
                                <div className="p-3 bg-zinc-800/50 rounded-xl group-hover/loc:bg-violet-500/10 transition-colors">
                                    <MapPin className="w-5 h-5 text-zinc-500 group-hover/loc:text-violet-500 transition-colors" />
                                </div>
                                <div className="pt-1">
                                    <p className="text-[9px] text-zinc-600 font-black uppercase tracking-[0.2em] italic mb-1">Lokácia</p>
                                    <p className="text-zinc-300 font-bold group-hover/loc:text-white transition-colors italic">{event.location}</p>
                                </div>
                            </div>
                        )}

                        {/* Description */}
                        {event.description && (
                            <div className="flex items-start gap-6 px-4 group/desc">
                                <div className="p-3 bg-zinc-800/50 rounded-xl group-hover/desc:bg-violet-500/10 transition-colors">
                                    <AlignLeft className="w-5 h-5 text-zinc-500 group-hover/desc:text-violet-500 transition-colors" />
                                </div>
                                <div className="flex-1 pt-1">
                                    <p className="text-[9px] text-zinc-600 font-black uppercase tracking-[0.2em] italic mb-3">Detaily poznámky</p>
                                    <div className="bg-white/[0.02] rounded-2xl p-6 text-[11px] text-zinc-400 leading-relaxed font-bold border border-white/[0.05] group-hover/desc:border-violet-500/20 transition-all italic tracking-tight">
                                        {event.description}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-12 pt-8 border-t border-white/5 flex gap-4">
                        {!isProject && (
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="flex-1 h-16 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.2em] italic transition-all flex items-center justify-center gap-3 active:scale-95 group/del"
                            >
                                {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5 group-hover/del:rotate-12 transition-transform" />}
                                <span>Odstrániť</span>
                            </button>
                        )}
                        {isProject ? (
                            <button
                                onClick={() => {
                                    window.location.href = '/dashboard/projects';
                                }}
                                className="flex-1 h-16 bg-violet-600 text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.2em] italic shadow-[0_10px_30px_rgba(139,92,246,0.3)] flex items-center justify-center gap-3 hover:bg-violet-500 transition-all active:scale-95 group/btn"
                            >
                                <ExternalLink className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /> Detail projektu
                            </button>
                        ) : (
                            <button
                                onClick={onClose}
                                className="flex-1 h-16 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.2em] italic transition-all flex items-center justify-center gap-3 group/close"
                            >
                                <X className="w-5 h-5 group-close:rotate-90 transition-transform" /> Zavrieť kartu
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

