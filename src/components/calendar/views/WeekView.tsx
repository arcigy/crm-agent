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
}

export function WeekView({ currentDate, events, onEventClick, onDateClick, showWeekends = true }: WeekViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd })
    .filter(day => showWeekends || (day.getDay() !== 0 && day.getDay() !== 6));

  return (
    <TimeGridView days={days} events={events} onEventClick={onEventClick} onDateClick={onDateClick} />
  );
}
