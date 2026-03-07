export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  color?: string;
  colorId?: string;
  location?: string;
  status?: string;
  htmlLink?: string;
  extendedProperties?: {
    private?: {
      type?: "project" | "task" | "contact";
      id?: string | number;
      contactId?: string | number;
    };
  };
}

export type CalendarView = "month" | "week" | "day" | "4days" | "year" | "agenda";
