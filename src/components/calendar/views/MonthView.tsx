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
}

export function MonthView({ currentDate, events, onEventClick }: MonthViewProps) {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days = eachDayOfInterval({
        start: calendarStart,
        end: calendarEnd,
    });

    const weekDays = ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'];

    return (
        <div className="flex flex-col h-full bg-gray-100 dark:bg-[#09090b]">
            <div className="grid grid-cols-7 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20">
                {weekDays.map((day) => (
                    <div key={day} className="py-3 text-center text-xs font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-wider">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 flex-1">
                {days.map((day) => {
                    const dayEvents = events.filter((event) => isSameDay(event.start, day));
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const iT = isToday(day);

                    return (
                        <div
                            key={day.toString()}
                            className={`min-h-[120px] border-b border-r border-gray-100 dark:border-white/5 p-2 transition-colors hover:bg-gray-50/50 dark:hover:bg-white/5 
                                ${iT ? 'bg-purple-50/50 dark:bg-purple-900/10' : 'bg-white dark:bg-[#09090b]'}
                                ${!isCurrentMonth ? 'opacity-40' : ''}
                            `}
                        >
                            <div className="flex justify-start mb-1">
                                <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full transition-colors 
                                    ${iT ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' : 
                                      isCurrentMonth ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-zinc-600'}
                                `}>
                                    {format(day, 'd')}
                                </span>
                            </div>

                            <div className="space-y-1 overflow-y-auto max-h-[100px] scrollbar-hide">
                                {dayEvents.map((event) => (
                                    <button
                                        key={event.id}
                                        onClick={() => onEventClick(event)}
                                        className={`w-full text-left px-2 py-1.5 text-[10px] font-bold rounded-lg border truncate transition-all shadow-sm active:scale-95
                                            ${event.color || 'border-blue-100 dark:border-blue-900/30 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-100 hover:bg-blue-100 dark:hover:bg-blue-900/40'}
                                        `}
                                        title={event.title}
                                    >
                                        <div className="flex items-center gap-1">
                                            {!event.allDay && <span className="opacity-60">{format(event.start, 'HH:mm')}</span>}
                                            <span className="truncate">{event.title}</span>
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
