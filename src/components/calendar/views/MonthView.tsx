'use client';

import {
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    format,
    isToday
} from 'date-fns';
import { sk } from 'date-fns/locale';
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
        <div className="flex flex-col h-full bg-gray-100">
            <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
                {weekDays.map((day) => (
                    <div key={day} className="py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
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
                            className={`min-h-[120px] bg-white border-b border-r border-gray-100 p-2 transition-colors hover:bg-gray-50/50 ${!isCurrentMonth ? 'bg-gray-50/30' : ''
                                }`}
                        >
                            <div className="flex justify-start mb-1">
                                <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${iT ? 'bg-blue-600 text-white' : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                                    }`}>
                                    {format(day, 'd')}
                                </span>
                            </div>

                            <div className="space-y-1 overflow-y-auto max-h-[80px] custom-scrollbar">
                                {dayEvents.map((event) => (
                                    <button
                                        key={event.id}
                                        onClick={() => onEventClick(event)}
                                        className={`w-full text-left px-2 py-1 text-xs rounded border truncate transition-colors shadow-sm ${event.color || 'border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100'
                                            }`}
                                        title={event.title}
                                    >
                                        {event.allDay ? '' : format(event.start, 'HH:mm ')}
                                        {event.title}
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
