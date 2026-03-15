"use client";

import { CalendarEvent } from "@/types/calendar";
import { TimeGridView } from "./TimeGridView";

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onDateClick?: (date: Date) => void;
  highlightFree?: boolean;
}

export function DayView({ currentDate, events, onEventClick, onDateClick, highlightFree = false }: DayViewProps) {
  return (
    <TimeGridView
      days={[currentDate]}
      events={events}
      onEventClick={onEventClick}
      onDateClick={onDateClick}
      highlightFree={highlightFree}
      currentDate={currentDate}
    />
  );
}
