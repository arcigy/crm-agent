"use client";

import { CalendarEvent, CalendarView as ViewType } from "@/types/calendar";
import { MonthView } from "./views/MonthView";
import { WeekView } from "./views/WeekView";
import { DayView } from "./views/DayView";
import { YearView } from "./views/YearView";
import { AgendaView } from "./views/AgendaView";
import { FourDayView } from "./views/FourDayView";

interface CalendarViewProps {
  view: ViewType;
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onDateClick?: (date: Date) => void;
  showWeekends?: boolean;
}

export function CalendarView({
  view,
  currentDate,
  events,
  onEventClick,
  onDateClick,
  showWeekends = true,
}: CalendarViewProps) {
  switch (view) {
    case "month":
      return (
        <MonthView
          currentDate={currentDate}
          events={events}
          onEventClick={onEventClick}
          onDayClick={onDateClick}
          showWeekends={showWeekends}
        />
      );
    case "week":
      return (
        <WeekView
          currentDate={currentDate}
          events={events}
          onEventClick={onEventClick}
          onDateClick={onDateClick}
          showWeekends={showWeekends}
        />
      );
    case "day":
      return (
        <DayView
          currentDate={currentDate}
          events={events}
          onEventClick={onEventClick}
          onDateClick={onDateClick}
        />
      );
    case "year":
      return (
        <YearView
          currentDate={currentDate}
          events={events}
          onEventClick={onEventClick}
        />
      );
    case "agenda":
      return (
        <AgendaView
          currentDate={currentDate}
          events={events}
          onEventClick={onEventClick}
        />
      );
    case "4days":
      return (
        <FourDayView
          currentDate={currentDate}
          events={events}
          onEventClick={onEventClick}
          onDateClick={onDateClick}
        />
      );
    default:
      return (
        <MonthView
          currentDate={currentDate}
          events={events}
          onEventClick={onEventClick}
        />
      );
  }
}
