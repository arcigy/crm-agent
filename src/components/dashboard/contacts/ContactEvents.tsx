"use client";

import * as React from "react";
import {
  Calendar,
  Clock,
  MapPin,
  ChevronRight,
  Loader2,
  CalendarX,
} from "lucide-react";
import { format, parseISO, isPast, isFuture } from "date-fns";
import { sk } from "date-fns/locale";
import { Lead } from "@/types/contact";
import { getCalendarEvents } from "@/app/actions/calendar";
import { EventDetailModal } from "@/components/calendar/EventDetailModal";
import { CalendarEvent } from "@/types/calendar";

interface ContactEventsProps {
  contact: Lead;
}

// Using CalendarEvent from @/types/calendar

export function ContactEvents({ contact }: ContactEventsProps) {
  const [events, setEvents] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedEvent, setSelectedEvent] =
    React.useState<CalendarEvent | null>(null);

  const contactName =
    `${contact.first_name} ${contact.last_name}`.toLowerCase();

  React.useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Fetch events from the last 6 months to next 6 months
        const now = new Date();
        const timeMin = new Date(
          now.getFullYear(),
          now.getMonth() - 6,
          1,
        ).toISOString();
        const timeMax = new Date(
          now.getFullYear(),
          now.getMonth() + 6,
          28,
        ).toISOString();

        const res = await getCalendarEvents(timeMin, timeMax);
        if (res.success && res.events) {
          // Filter events that mention this contact or have its ID linked
          const filtered = res.events.filter((e: any) => {
            // Priority 1: Direct ID link
            const idMatch = e.extendedProperties?.private?.contactId === String(contact.id);
            if (idMatch) return true;

            // Priority 2: Name mention (Fallback)
            const summary = (e.summary || e.title || "").toLowerCase();
            const description = (e.description || "").toLowerCase();
            const inSummary = summary.includes(contactName);
            const inDescription = description.includes(contactName);
            return inSummary || inDescription;
          });
          setEvents(filtered);
        }
      } catch (err) {
        console.error("Failed to load events:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [contact.id, contactName]);

  const now = new Date();

  const openEventDetail = (event: any) => {
    const startDate = event.start?.dateTime
      ? parseISO(event.start.dateTime)
      : event.start?.date
        ? parseISO(event.start.date)
        : event.start instanceof Date ? event.start : new Date();

    const endDate = event.end?.dateTime
      ? parseISO(event.end.dateTime)
      : event.end?.date
        ? parseISO(event.end.date)
        : event.end instanceof Date ? event.end : startDate;

    const calendarEvent: any = {
      id: event.id,
      title: event.summary || event.title || "Bez názvu",
      description: event.description,
      start: startDate,
      end: endDate,
      allDay: !event.start?.dateTime,
      location: event.location,
      color: "blue",
    };
    setSelectedEvent(calendarEvent);
  };

  // Separate upcoming and past events
  const upcomingEvents = events
    .filter((e) => {
      const startStr = e.start?.dateTime || e.start?.date || e.start;
      const start = typeof startStr === 'string' ? parseISO(startStr) : (startStr instanceof Date ? startStr : new Date());
      return isFuture(start) || start.toDateString() === now.toDateString();
    })
    .sort((a, b) => {
      const aStr = a.start?.dateTime || a.start?.date || a.start;
      const bStr = b.start?.dateTime || b.start?.date || b.start;
      const aStart = typeof aStr === 'string' ? parseISO(aStr) : (aStr instanceof Date ? aStr : new Date());
      const bStart = typeof bStr === 'string' ? parseISO(bStr) : (bStr instanceof Date ? bStr : new Date());
      return aStart.getTime() - bStart.getTime();
    });
 
  const pastEvents = events
    .filter((e) => {
      const startStr = e.start?.dateTime || e.start?.date || e.start;
      const start = typeof startStr === 'string' ? parseISO(startStr) : (startStr instanceof Date ? startStr : new Date());
      return isPast(start) && start.toDateString() !== now.toDateString();
    })
    .sort((a, b) => {
       const aStr = a.start?.dateTime || a.start?.date || a.start;
       const bStr = b.start?.dateTime || b.start?.date || b.start;
       const aStart = typeof aStr === 'string' ? parseISO(aStr) : (aStr instanceof Date ? aStr : new Date());
       const bStart = typeof bStr === 'string' ? parseISO(bStr) : (bStr instanceof Date ? bStr : new Date());
      return bStart.getTime() - aStart.getTime(); // Most recent first
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-center p-12 relative overflow-hidden">
        {/* Subtle Neon Background Decorations */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center">
            <div className="w-20 h-20 bg-blue-500/10 rounded-[2rem] border border-blue-500/20 flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(59,130,246,0.15)] group transition-transform hover:scale-110">
              <CalendarX className="w-9 h-9 text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            </div>
            
            <h3 className="text-xl font-bold text-white mb-3 tracking-tight drop-shadow-sm">
              Žiadne udalosti na obzore
            </h3>
            
            <p className="text-sm text-zinc-400 max-w-sm leading-relaxed font-medium">
              S týmto kontaktom nemáte zatiaľ naplánované žiadne stretnutia. Vytvorte novú udalosť v kalendári a v názve uveďte meno klienta.
            </p>
        </div>
      </div>
    );
  }

  const EventCard = ({
    event,
    isPastEvent = false,
  }: {
    event: any;
    isPastEvent?: boolean;
  }) => {
    const startStr = event.start?.dateTime || event.start?.date || event.start;
    const startDate = typeof startStr === 'string' ? parseISO(startStr) : (startStr instanceof Date ? startStr : new Date());
    const isAllDay = !event.start?.dateTime;

    return (
      <button
        onClick={() => openEventDetail(event)}
        className={`w-full text-left p-4 rounded-2xl border transition-all group hover:shadow-md ${
          isPastEvent
            ? "bg-gray-50 border-gray-100 opacity-60 hover:opacity-100"
            : "bg-white border-gray-100 hover:border-blue-200"
        }`}
      >
        <div className="flex items-start gap-4">
          {/* Date Badge */}
          <div
            className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl shrink-0 ${
              isPastEvent ? "bg-gray-200" : "bg-blue-50"
            }`}
          >
            <span
              className={`text-xs font-black uppercase ${isPastEvent ? "text-gray-500" : "text-blue-600"}`}
            >
              {format(startDate, "MMM", { locale: sk })}
            </span>
            <span
              className={`text-xl font-black ${isPastEvent ? "text-gray-600" : "text-blue-700"}`}
            >
              {format(startDate, "d")}
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4
              className={`font-bold truncate mb-1 ${isPastEvent ? "text-gray-600" : "text-gray-900 group-hover:text-blue-600"} transition-colors`}
            >
              {event.summary || event.title}
            </h4>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              {!isAllDay && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {format(startDate, "HH:mm")}
                </span>
              )}
              {isAllDay && (
                <span className="text-orange-600 font-bold">Celý deň</span>
              )}
              {event.location && (
                <span className="flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3" />
                  {event.location}
                </span>
              )}
            </div>
          </div>

          {/* Arrow */}
          <ChevronRight
            className={`w-5 h-5 shrink-0 ${isPastEvent ? "text-gray-300" : "text-gray-300 group-hover:text-blue-500"} transition-colors`}
          />
        </div>
      </button>
    );
  };

  return (
    <div className="p-8 space-y-8">
      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-5 h-5 text-blue-500" />
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-900">
              Nadchádzajúce udalosti
            </h3>
            <span className="bg-blue-100 text-blue-700 text-xs font-black px-2 py-0.5 rounded-full">
              {upcomingEvents.length}
            </span>
          </div>
          <div className="space-y-3">
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      )}

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-5 h-5 text-gray-400" />
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">
              Minulé udalosti
            </h3>
            <span className="bg-gray-100 text-gray-500 text-xs font-black px-2 py-0.5 rounded-full">
              {pastEvents.length}
            </span>
          </div>
          <div className="space-y-3">
            {pastEvents.slice(0, 5).map((event) => (
              <EventCard key={event.id} event={event} isPastEvent />
            ))}
            {pastEvents.length > 5 && (
              <p className="text-center text-xs text-gray-400 font-bold py-2">
                + {pastEvents.length - 5} ďalších minulých udalostí
              </p>
            )}
          </div>
        </div>
      )}

      {/* Event Detail Modal */}
      <EventDetailModal
        event={selectedEvent}
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
}
