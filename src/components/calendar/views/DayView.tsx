'use client';

import {
    format,
    isSameDay,
    addHours,
    startOfDay,
    isToday
} from 'date-fns';
import { sk } from 'date-fns/locale';
import { CalendarEvent } from '@/types/calendar';

interface DayViewProps {
    currentDate: Date;
    events: CalendarEvent[];
    onEventClick: (event: CalendarEvent) => void;
}

export function DayView({ currentDate, events, onEventClick }: DayViewProps) {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dayEvents = events.filter(e => isSameDay(e.start, currentDate));

    return (
        <div className="flex flex-col h-[700px] overflow-hidden bg-white">
            <div className="flex-1 overflow-y-auto relative custom-scrollbar">
                <div className="flex">
                    <div className="w-20 bg-gray-50 border-r border-gray-200 shrink-0">
                        {hours.map((hour) => (
                            <div key={hour} className="h-24 text-xs text-gray-400 text-right pr-3 pt-3 border-b border-gray-100">
                                {format(addHours(startOfDay(currentDate), hour), 'HH:mm')}
                            </div>
                        ))}
                    </div>

                    <div className="flex-1 relative min-h-[1600px] bg-white">
                        {hours.map((hour) => (
                            <div key={hour} className="h-24 border-b border-gray-50 last:border-b-0" />
                        ))}

                        {dayEvents.map(event => {
                            const startHour = event.start.getHours();
                            const startMin = event.start.getMinutes();
                            const durationHrs = (event.end.getTime() - event.start.getTime()) / (1000 * 60 * 60);

                            return (
                                <button
                                    key={event.id}
                                    onClick={() => onEventClick(event)}
                                    className={`absolute left-4 right-4 border rounded-xl p-4 text-sm shadow-md overflow-hidden z-20 transition-all hover:scale-[1.01] active:scale-[0.99] text-left ${event.color || 'bg-blue-50 border-blue-300 text-blue-800 hover:bg-blue-100'
                                        }`}
                                    style={{
                                        top: `${(startHour + startMin / 60) * 96}px`,
                                        height: `${Math.max(durationHrs * 96, 48)}px`
                                    }}
                                >
                                    <div className="font-bold text-lg mb-1">{event.title}</div>
                                    <div className="flex items-center gap-2 opacity-80 text-xs text-inherit">
                                        <span className={`px-2 py-0.5 rounded-full font-medium ${event.color?.includes('indigo') ? 'bg-indigo-200' : event.color?.includes('amber') ? 'bg-amber-200' : 'bg-blue-200'}`}>
                                            {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
                                        </span>
                                        {event.location && <span className="truncate">📍 {event.location}</span>}
                                    </div>
                                    {event.description && <div className="mt-2 text-inherit opacity-80 line-clamp-2 italic">{event.description}</div>}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
