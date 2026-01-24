'use client';

import { CalendarEvent, CalendarView as ViewType } from '@/types/calendar';
import { MonthView } from './views/MonthView';
import { WeekView } from './views/WeekView';
import { DayView } from './views/DayView';

interface CalendarViewProps {
    view: ViewType;
    currentDate: Date;
    events: CalendarEvent[];
    onEventClick: (event: CalendarEvent) => void;
}

export function CalendarView({ view, currentDate, events, onEventClick }: CalendarViewProps) {
    switch (view) {
        case 'month':
            return <MonthView currentDate={currentDate} events={events} onEventClick={onEventClick} />;
        case 'week':
            return <WeekView currentDate={currentDate} events={events} onEventClick={onEventClick} />;
        case 'day':
            return <DayView currentDate={currentDate} events={events} onEventClick={onEventClick} />;
        default:
            return null;
    }
}
