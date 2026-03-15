"use client";

import { startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { CalendarEvent } from "@/types/calendar";
import { TimeGridView } from "./TimeGridView";

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onDateClick?: (date: Date) => void;
  showWeekends?: boolean;
  highlightFree?: boolean;
}

export function WeekView({ currentDate, events, onEventClick, onDateClick, showWeekends = true, highlightFree = false }: WeekViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  return (
    <TimeGridView days={days} events={events} onEventClick={onEventClick} onDateClick={onDateClick} highlightFree={highlightFree} currentDate={currentDate} />
  );
}
