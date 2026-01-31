"use client";

import { startOfToday, addDays } from "date-fns";
import { CalendarEvent } from "@/types/calendar";
import { TimeGridView } from "./TimeGridView";

interface FourDayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

export function FourDayView({
  currentDate,
  events,
  onEventClick,
}: FourDayViewProps) {
  const days = Array.from({ length: 4 }, (_, i) => addDays(currentDate, i));

  return (
    <TimeGridView days={days} events={events} onEventClick={onEventClick} />
  );
}
