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
}

export function CalendarView({
  view,
  currentDate,
  events,
  onEventClick,
}: CalendarViewProps) {
  switch (view) {
    case "month":
      return (
        <MonthView
          currentDate={currentDate}
          events={events}
          onEventClick={onEventClick}
        />
      );
    case "week":
      return (
        <WeekView
          currentDate={currentDate}
          events={events}
          onEventClick={onEventClick}
        />
      );
    case "day":
      return (
        <DayView
          currentDate={currentDate}
          events={events}
          onEventClick={onEventClick}
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
