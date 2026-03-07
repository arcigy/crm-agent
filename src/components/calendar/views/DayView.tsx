"use client";

import { CalendarEvent } from "@/types/calendar";
import { TimeGridView } from "./TimeGridView";

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onDateClick?: (date: Date) => void;
}

export function DayView({ currentDate, events, onEventClick, onDateClick }: DayViewProps) {
  return (
    <TimeGridView
      days={[currentDate]}
      events={events}
      onEventClick={onEventClick}
      onDateClick={onDateClick}
    />
  );
}
