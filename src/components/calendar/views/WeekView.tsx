"use client";

import { startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { CalendarEvent } from "@/types/calendar";
import { TimeGridView } from "./TimeGridView";

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

export function WeekView({ currentDate, events, onEventClick }: WeekViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  return (
    <TimeGridView days={days} events={events} onEventClick={onEventClick} />
  );
}
