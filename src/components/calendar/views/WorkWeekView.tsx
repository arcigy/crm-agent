"use client";

import { addDays, isWeekend } from "date-fns";
import { CalendarEvent } from "@/types/calendar";
import { TimeGridView } from "./TimeGridView";

interface WorkWeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onDateClick?: (date: Date) => void;
  highlightFree?: boolean;
}

export function WorkWeekView({
  currentDate,
  events,
  onEventClick,
  onDateClick,
  highlightFree = false,
}: WorkWeekViewProps) {
  // Generate the next 5 working days starting from (or after) currentDate
  const days: Date[] = [];
  let checkDate = new Date(currentDate);
  
  while (days.length < 5) {
    if (!isWeekend(checkDate)) {
      days.push(new Date(checkDate));
    }
    checkDate = addDays(checkDate, 1);
  }

  return (
    <TimeGridView 
      days={days} 
      events={events} 
      onEventClick={onEventClick} 
      onDateClick={onDateClick} 
      highlightFree={highlightFree}
      currentDate={currentDate}
    />
  );
}
