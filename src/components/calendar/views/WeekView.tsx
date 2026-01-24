'use client';

import {
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    format,
    isSameDay,
    addHours,
    startOfDay,
    isToday
} from 'date-fns';
import { sk } from 'date-fns/locale';
import { CalendarEvent } from '@/types/calendar';

interface WeekViewProps {
    currentDate: Date;
    events: CalendarEvent[];
    onEventClick: (event: CalendarEvent) => void;
}

export function WeekView({ currentDate, events, onEventClick }: WeekViewProps) {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
        <div className="flex flex-col h-[700px] overflow-hidden bg-white">
            <div className="flex bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                <div className="w-16 border-r border-gray-200 shrink-0" />
                {days.map((day) => (
                    <div key={day.toString()} className="flex-1 py-3 text-center border-r border-gray-100 last:border-r-0">
                        <div className="text-xs font-semibold text-gray-400 uppercase">{format(day, 'EEE', { locale: sk })}</div>
                        <div className={`text-lg font-bold mt-1 inline-flex items-center justify-center w-8 h-8 rounded-full ${isToday(day) ? 'bg-blue-600 text-white' : 'text-gray-900'
                            }`}>
                            {format(day, 'd')}
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto relative custom-scrollbar">
                <div className="flex">
                    <div className="w-16 bg-gray-50 border-r border-gray-200 shrink-0">
                        {hours.map((hour) => (
                            <div key={hour} className="h-20 text-[10px] text-gray-400 text-right pr-2 pt-2 border-b border-gray-100">
                                {format(addHours(startOfDay(currentDate), hour), 'HH:mm')}
                            </div>
                        ))}
                    </div>

                    <div className="flex-1 grid grid-cols-7 relative">
                        {days.map((day) => (
                            <div key={day.toString()} className="border-r border-gray-100 last:border-r-0 relative min-h-[1600px]">
                                {hours.map((hour) => (
                                    <div key={hour} className="h-20 border-b border-gray-50 last:border-b-0" />
                                ))}

                                {events.filter(e => isSameDay(e.start, day)).map(event => {
                                    const startHour = event.start.getHours();
                                    const startMin = event.start.getMinutes();
                                    const durationHrs = (event.end.getTime() - event.start.getTime()) / (1000 * 60 * 60);

                                    return (
                                        <button
                                            key={event.id}
                                            onClick={() => onEventClick(event)}
                                            className={`absolute left-1 right-1 border rounded-md p-1.5 text-xs shadow-sm overflow-hidden z-20 transition-colors text-left ${event.color || 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                                                }`}
                                            style={{
                                                top: `${(startHour + startMin / 60) * 80}px`,
                                                height: `${Math.max(durationHrs * 80, 24)}px`
                                            }}
                                        >
                                            <div className="font-bold truncate">{event.title}</div>
                                            {durationHrs > 0.5 && <div className="opacity-70">{format(event.start, 'HH:mm')}</div>}
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
