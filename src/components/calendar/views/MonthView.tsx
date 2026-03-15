'use client';

import {
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameDay,
    isToday,
    format,
    isSameMonth,
    setHours,
    setMinutes,
    isWithinInterval
} from 'date-fns';
import { CalendarEvent } from '@/types/calendar';
import { useState } from 'react';
import { Clock, Info, X } from 'lucide-react';

interface MonthViewProps {
    currentDate: Date;
    events: CalendarEvent[];
    onEventClick: (event: CalendarEvent) => void;
    onDayClick?: (date: Date) => void;
    showWeekends?: boolean;
    highlightFree?: boolean;
}

export function MonthView({ currentDate, events, onEventClick, onDayClick, showWeekends = true, highlightFree = false }: MonthViewProps) {
    const [selectedSlotDay, setSelectedSlotDay] = useState<Date | null>(null);

    const getFreeRanges = (day: Date, dayEvents: CalendarEvent[]) => {
        const now = new Date();
        const workingStart = 8;
        const workingEnd = 20;
        
        let currentStart = setMinutes(setHours(new Date(day), workingStart), 0);
        if (isToday(day)) {
            const nowRounded = new Date(now);
            nowRounded.setSeconds(0, 0);
            if (nowRounded > currentStart) {
                currentStart = nowRounded;
            }
        }
        
        const limitEnd = setMinutes(setHours(new Date(day), workingEnd), 0);
        if (currentStart >= limitEnd) return [];

        const sortedEvents = dayEvents
            .filter(e => !e.allDay)
            .sort((a, b) => a.start.getTime() - b.start.getTime());

        const ranges = [];

        for (const event of sortedEvents) {
            const eStart = new Date(event.start);
            const eEnd = new Date(event.end);

            if (eStart > currentStart) {
                const gapEnd = eStart < limitEnd ? eStart : limitEnd;
                // Only show gaps larger than 15 minutes
                if (gapEnd.getTime() - currentStart.getTime() >= 15 * 60 * 1000) {
                    ranges.push(`${format(currentStart, 'HH:mm')} - ${format(gapEnd, 'HH:mm')}`);
                }
            }
            
            if (eEnd > currentStart) {
                currentStart = eEnd;
            }
            
            if (currentStart >= limitEnd) break;
        }

        if (currentStart < limitEnd && limitEnd.getTime() - currentStart.getTime() >= 15 * 60 * 1000) {
            ranges.push(`${format(currentStart, 'HH:mm')} - ${format(limitEnd, 'HH:mm')}`);
        }

        return ranges;
    };

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days = eachDayOfInterval({
        start: calendarStart,
        end: calendarEnd,
    });

    const weekDays = showWeekends ? ['PON', 'UT', 'STR', 'ŠTV', 'PIA', 'SOB', 'NED'] : ['PON', 'UT', 'STR', 'ŠTV', 'PIA'];

    return (
        <div className="flex flex-col h-full bg-[#050507]">
            <div className={`grid ${showWeekends ? 'grid-cols-7' : 'grid-cols-5'} border-b border-white/[0.03] bg-black/40`}>
                {weekDays.map((day) => (
                    <div key={day} className="py-4 text-center text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] italic">
                        {day}
                    </div>
                ))}
            </div>

            <div className={`grid ${showWeekends ? 'grid-cols-7' : 'grid-cols-5'} auto-rows-fr flex-1 min-h-0 bg-transparent`}>
                {days.filter(day => showWeekends || (day.getDay() !== 0 && day.getDay() !== 6)).map((day) => {
                    const dayEvents = events.filter((event) => isSameDay(event.start, day));
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const iT = isToday(day);
                    const isSelected = isSameDay(day, currentDate) && !iT;

                    return (
                        <div
                            key={day.toString()}
                            onClick={() => onDayClick?.(day)}
                            className={`flex flex-col border-b border-r p-2.5 sm:p-3 transition-all duration-300 hover:bg-white/[0.03] group/day overflow-hidden relative min-h-[100px] cursor-pointer
                                ${iT ? 'bg-[#7c3aed]/[0.05] shadow-[inset_0_0_120px_rgba(124,58,237,0.15)] border-[#7c3aed]/20 relative z-10' : 'bg-transparent border-white/[0.02]'}
                                ${isSelected ? 'border-violet-500/50 bg-violet-500/[0.03] z-10 shadow-[0_0_20px_rgba(139,92,246,0.1)]' : ''}
                                ${!isCurrentMonth ? 'opacity-20 grayscale' : ''}
                            `}
                        >
                            {iT && <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#7c3aed] to-transparent" />}
                            {iT && <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#7c3aed] to-transparent" />}
                            {iT && <div className="absolute top-0 right-0 w-[1px] h-full bg-gradient-to-b from-transparent via-[#7c3aed] to-transparent" />}
                            {iT && <div className="absolute top-0 left-0 w-[1px] h-full bg-gradient-to-b from-transparent via-[#7c3aed] to-transparent" />}

                            <div className="flex justify-start mb-2 shrink-0">
                                <span className={`text-[14px] font-mono font-bold flex items-center justify-center transition-all duration-500 leading-none
                                    ${iT ? 'w-7 h-7 rounded-full bg-[#7c3aed] text-white shadow-[0_0_15px_rgba(124,58,237,0.8)] scale-110 ml-[-2px] mt-[-2px]' : 
                                      isSelected ? 'text-violet-400 font-bold' :
                                      isCurrentMonth ? 'text-zinc-200 group-hover/day:text-white' : 'text-zinc-700'}
                                `}>
                                    {format(day, 'd')}
                                </span>
                            </div>

                            <div className="space-y-1 overflow-y-auto scrollbar-hide flex-1 pb-1">
                                {dayEvents.map((event) => (                                    <button
                                         key={event.id}
                                         onClick={(e) => {
                                             e.stopPropagation();
                                             onEventClick(event);
                                         }}
                                         className={`w-full text-left px-2.5 py-2 text-[11px] font-bold uppercase tracking-tight rounded-[0.8rem] border transition-all group/event relative overflow-hidden shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.2)]
                                             bg-zinc-500/10 border-zinc-500/20 text-zinc-100 hover:bg-zinc-500/20 hover:border-zinc-500/40 hover:text-white
                                             ${highlightFree ? 'opacity-20 grayscale-70 blur-[0.5px]' : ''}
                                         `}
                                         title={event.title}
                                     >
                                         <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover/event:opacity-100 transition-opacity" />
                                         <div className="flex items-center gap-2 relative z-10 leading-none">
                                             {!event.allDay && (
                                                 <span className="opacity-60 tabular-nums italic shrink-0 text-[10px]">
                                                     {format(event.start, 'HH:mm')}
                                                 </span>
                                             )}
                                             <span className="truncate italic drop-shadow-sm font-black">{event.title}</span>
                                         </div>
                                     </button>
                                ))}
                            </div>

                            {highlightFree && isCurrentMonth && (isToday(day) || day > new Date()) && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedSlotDay(day);
                                    }}
                                    className="absolute bottom-2 right-2 p-2 rounded-xl bg-violet-600/40 text-white hover:bg-violet-500 transition-all border border-violet-400/50 z-20 group/info shadow-[0_0_15px_rgba(139,92,246,0.3)] animate-pulse"
                                    title="Zobraziť voľné termíny"
                                >
                                    <Clock size={12} className="group-hover/info:scale-110 transition-transform" />
                                </button>
                            )}

                            {selectedSlotDay && isSameDay(day, selectedSlotDay) && (
                                <div 
                                    className="absolute inset-0 z-[100] bg-[#0a0a0c]/98 backdrop-blur-xl p-2 flex flex-col animate-in fade-in zoom-in duration-200"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="flex items-center justify-between mb-1.5 border-b border-white/5 pb-1">
                                        <div className="flex items-center gap-1.5">
                                            <Clock size={10} className="text-violet-400" />
                                            <span className="text-[8px] font-black uppercase tracking-tight text-zinc-400">Voľné bloky</span>
                                        </div>
                                        <button 
                                            onClick={() => setSelectedSlotDay(null)}
                                            className="p-1 hover:bg-white/5 rounded-md transition-colors"
                                        >
                                            <X size={10} className="text-zinc-600" />
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto scrollbar-hide grid grid-cols-2 gap-1.5 mt-1">
                                        {getFreeRanges(day, dayEvents).map(range => (
                                            <div 
                                                key={range}
                                                className="px-1 py-2 rounded-lg bg-white/[0.03] border border-white/[0.05] text-[10px] font-mono font-bold text-violet-400 text-center hover:bg-violet-500/20 hover:border-violet-500/40 hover:text-white transition-all cursor-pointer active:scale-95 flex items-center justify-center leading-tight whitespace-nowrap"
                                            >
                                                {range}
                                            </div>
                                        ))}
                                        {getFreeRanges(day, dayEvents).length === 0 && (
                                            <div className="col-span-2 flex-1 flex items-center justify-center text-[7px] text-zinc-600 italic text-center py-4">
                                                Plno
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
