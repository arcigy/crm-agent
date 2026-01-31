"use client";

import { CalendarEvent } from "@/types/calendar";
import { TimeGridView } from "./TimeGridView";

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

export function DayView({ currentDate, events, onEventClick }: DayViewProps) {
  return (
    <TimeGridView
      days={[currentDate]}
      events={events}
      onEventClick={onEventClick}
    />
  );
}
