// Google Calendar Event types
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  allDay: boolean;
  color?: string;
  location?: string;
  attendees?: string[];
  googleEventId?: string;
  contact?: any;
}

export interface GoogleTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_at: Date;
}

export type CalendarView =
  | "month"
  | "week"
  | "day"
  | "year"
  | "agenda"
  | "4days";

export interface CalendarLayer {
  id: string;
  name: string;
  color: string;
  active: boolean;
  type: "google" | "crm" | "holiday" | "birthday";
}

export interface CalendarState {
  currentDate: Date;
  view: CalendarView;
  events: CalendarEvent[];
  isLoading: boolean;
  isConnected: boolean;
  activeLayers: string[];
}
