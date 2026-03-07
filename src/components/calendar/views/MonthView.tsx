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
    isSameMonth
} from 'date-fns';
import { CalendarEvent } from '@/types/calendar';

interface MonthViewProps {
    currentDate: Date;
    events: CalendarEvent[];
    onEventClick: (event: CalendarEvent) => void;
    onDayClick?: (date: Date) => void;
    showWeekends?: boolean;
}

export function MonthView({ currentDate, events, onEventClick, onDayClick, showWeekends = true }: MonthViewProps) {
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

                    return (
                        <div
                            key={day.toString()}
                            onClick={() => onDayClick?.(day)}
                            className={`flex flex-col border-b border-r p-2.5 sm:p-3 transition-all duration-300 hover:bg-white/[0.03] group/day overflow-hidden relative min-h-[100px] cursor-pointer
                                ${iT ? 'bg-[#7c3aed]/[0.05] shadow-[inset_0_0_120px_rgba(124,58,237,0.15)] border-[#7c3aed]/20 relative z-10' : 'bg-transparent border-white/[0.02]'}
                                ${!isCurrentMonth ? 'opacity-20 grayscale' : ''}
                            `}
                        >
                            {iT && <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#7c3aed] to-transparent" />}
                            {iT && <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#7c3aed] to-transparent" />}
                            {iT && <div className="absolute top-0 right-0 w-[1px] h-full bg-gradient-to-b from-transparent via-[#7c3aed] to-transparent" />}
                            {iT && <div className="absolute top-0 left-0 w-[1px] h-full bg-gradient-to-b from-transparent via-[#7c3aed] to-transparent" />}

                            <div className="flex justify-start mb-2 shrink-0">
                                <span className={`text-[11px] font-black flex items-center justify-center transition-all duration-500 leading-none
                                    ${iT ? 'w-6 h-6 rounded-full bg-[#7c3aed] text-white shadow-[0_0_15px_rgba(124,58,237,0.8)] scale-110 ml-[-2px] mt-[-2px]' : 
                                      isCurrentMonth ? 'text-zinc-200 group-hover/day:text-white' : 'text-zinc-700'}
                                `}>
                                    {format(day, 'd')}
                                </span>
                            </div>

                            <div className="space-y-1 overflow-y-auto thin-scrollbar flex-1 pb-1">
                                {dayEvents.map((event) => (
                                    <button
                                        key={event.id}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEventClick(event);
                                        }}
                                        className={`w-full text-left px-2 py-1.5 text-[8.5px] font-black uppercase tracking-wider rounded-[0.5rem] border transition-all group/event relative overflow-hidden shrink-0 shadow-[0_2px_6px_rgba(0,0,0,0.15)]
                                            bg-zinc-500/10 border-zinc-500/20 text-zinc-400 hover:bg-zinc-500/20 hover:border-zinc-500/30 hover:text-zinc-200
                                        `}
                                        title={event.title}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover/event:opacity-100 transition-opacity" />
                                        <div className="flex items-center gap-1.5 relative z-10">
                                            {!event.allDay && (
                                                <span className="opacity-70 font-black tabular-nums italic shrink-0">
                                                    {format(event.start, 'HH:mm')}
                                                </span>
                                            )}
                                            <span className="truncate italic drop-shadow-sm">{event.title}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
