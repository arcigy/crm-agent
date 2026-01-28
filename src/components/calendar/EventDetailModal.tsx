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
}

export function EventDetailModal({ event, isOpen, onClose, onOpenContact }: EventDetailModalProps) {
    if (!isOpen || !event) return null;

    const isProject = event.id.startsWith('p-');

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />

            <div className={`bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100`}>
                {/* Header Gradient */}
                <div className={`h-3 w-full ${event.color?.includes('indigo') ? 'bg-indigo-600' : event.color?.includes('amber') ? 'bg-amber-600' : 'bg-blue-600'}`} />

                <div className="p-8">
                    <div className="flex items-start justify-between mb-8">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${isProject ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-blue-50 text-blue-700 border-blue-100'
                                    }`}>
                                    {isProject ? 'Projektová udalosť' : 'Udalosť v kalendári'}
                                </span>
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 leading-tight tracking-tight">
                                {event.title}
                            </h2>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors shrink-0">
                            <X className="w-6 h-6 text-gray-400" />
                        </button>
                    </div>

                    <div className="space-y-6">
                        {/* Time & Date */}
                        <div className="flex items-center gap-6 p-5 bg-gray-50 rounded-3xl border border-gray-100 shadow-inner">
                            <div className="bg-white p-3 rounded-2xl shadow-sm">
                                <Calendar className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none mb-1">Dátum a Čas</p>
                                <p className="text-gray-900 font-bold">
                                    {format(event.start, 'd. MMMM yyyy', { locale: sk })}
                                </p>
                                {!event.allDay && (
                                    <p className="text-blue-600 text-sm font-black flex items-center gap-1.5 mt-0.5">
                                        <Clock className="w-3.5 h-3.5" />
                                        {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
                                    </p>
                                )}
                                {event.allDay && <p className="text-orange-600 text-[10px] font-black uppercase tracking-widest mt-1">Celodenná udalosť</p>}
                            </div>
                        </div>

                        {/* Location */}
                        {event.location && (
                            <div className="flex items-start gap-4 px-2">
                                <MapPin className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-0.5">Miesto</p>
                                    <p className="text-gray-800 font-bold">{event.location}</p>
                                </div>
                            </div>
                        )}

                        {/* Description */}
                        {event.description && (
                            <div className="flex items-start gap-4 px-2">
                                <AlignLeft className="w-5 h-5 text-gray-400 mt-1 shrink-0" />
                                <div className="flex-1">
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1.5">Popis / Poznámky</p>
                                    <div className="bg-gray-50 rounded-2xl p-4 text-sm text-gray-700 leading-relaxed font-medium border border-gray-100 whitespace-pre-wrap">
                                        {event.description}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-8 pt-8 border-t border-gray-100 flex gap-4">
                        {isProject ? (
                            <button
                                onClick={() => {
                                    // Prelinkovanie do sekcie projekty
                                    window.location.href = '/dashboard/projects';
                                }}
                                className="flex-1 h-14 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 hover:bg-black transition-all active:scale-95"
                            >
                                <ExternalLink className="w-5 h-5" /> Detail projektu
                            </button>
                        ) : isProject && event.contact && onOpenContact ? (
                            <button
                                onClick={() => {
                                    onClose();
                                    onOpenContact(event.contact);
                                }}
                                className="flex-1 h-14 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-all active:scale-95"
                            >
                                <User className="w-5 h-5" /> Detail klienta
                            </button>
                        ) : (
                            <button
                                onClick={onClose}
                                className="flex-1 h-14 border-2 border-gray-100 text-gray-400 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                            >
                                Zavrieť detail
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
