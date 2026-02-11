export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
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
