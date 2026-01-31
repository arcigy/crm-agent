"use client";

import * as React from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Video,
  RefreshCw,
  Unlink,
  Link as LinkIcon,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday,
  parseISO,
} from "date-fns";
import { toast } from "sonner";
import {
  getCalendarEvents,
  getCalendarConnectionStatus,
  disconnectGoogle,
} from "@/app/actions/calendar";
import { CreateEventModal } from "@/components/calendar/CreateEventModal";

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  location?: string;
  hangoutLink?: string;
}

export function CalendarView() {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [events, setEvents] = React.useState<CalendarEvent[]>([]);
  const [isConnected, setIsConnected] = React.useState<boolean | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);

  const checkStatus = React.useCallback(async () => {
    const { isConnected } = await getCalendarConnectionStatus();
    setIsConnected(isConnected);
    if (isConnected) {
      fetchEvents();
    } else {
      setLoading(false);
    }
  }, [currentDate]);

  const fetchEvents = async () => {
    setSyncing(true);
    const start = startOfMonth(currentDate).toISOString();
    const end = endOfMonth(currentDate).toISOString();
    const result = await getCalendarEvents(start, end);
    if (result.success) {
      setEvents(result.events as CalendarEvent[]);
      toast.success("Calendar synchronized");
    } else if (result.isConnected === false) {
      setIsConnected(false);
    } else {
      toast.error(result.error || "Failed to sync calendar");
    }
    setSyncing(false);
    setLoading(false);
  };

  React.useEffect(() => {
    checkStatus();
  }, [currentDate, checkStatus]);

  const handleConnect = async () => {
    try {
      const res = await fetch("/api/google/auth");
      const data = await res.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error("Failed to get auth URL:", error);
    }
  };

  const handleDisconnect = async () => {
    if (confirm("Are you sure you want to disconnect Google Calendar?")) {
      const result = await disconnectGoogle();
      if (result.success) {
        setIsConnected(false);
        setEvents([]);
        toast.success("Google account disconnected");
      } else {
        toast.error("Failed to disconnect");
      }
    }
  };

  // Calendar Grid Logic
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const getEventsForDay = (day: Date) => {
    return events.filter((event) => {
      const eventStart = event.start.dateTime
        ? parseISO(event.start.dateTime)
        : event.start.date
          ? parseISO(event.start.date)
          : null;
      return eventStart && isSameDay(eventStart, day);
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] bg-white/50 backdrop-blur-sm rounded-3xl border border-white/20 shadow-xl">
        <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mb-4" />
        <p className="text-gray-500 font-medium tracking-tight">
          Synchronizing with Google...
        </p>
      </div>
    );
  }

  if (isConnected === false) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600"></div>
        <div className="p-8 bg-blue-50/50 rounded-3xl mb-8 shadow-inner border border-blue-100/50">
          <CalendarIcon className="w-20 h-20 text-blue-600" />
        </div>
        <h2 className="text-4xl font-black text-gray-900 mb-3 tracking-tight">
          Connect Workspace
        </h2>
        <p className="text-gray-500 max-w-md text-center mb-10 px-8 text-lg font-medium leading-relaxed">
          Sync your Google Calendar to manage meetings, view your schedule, and
          close deals directly from the CRM.
        </p>
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <button
            onClick={handleConnect}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-[0_10px_20px_-5px_rgba(37,99,235,0.4)] active:scale-95 group"
          >
            <LinkIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
            Connect Google Account
          </button>
          <p className="text-[10px] text-gray-400 text-center uppercase font-black tracking-widest">
            Secure OAuth2 Authorization
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2rem] shadow-2xl border border-gray-200/50 overflow-hidden flex flex-col h-full min-h-[700px] transform transition-all">
      {/* Header */}
      <header className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="flex items-center gap-8">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1">
              Calendar
            </span>
            <h2 className="text-3xl font-black text-gray-900 tracking-tighter leading-none">
              {format(currentDate, "MMMM yyyy")}
            </h2>
          </div>

          <div className="flex items-center bg-gray-100/50 p-1.5 rounded-2xl border border-gray-200/50">
            <button
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all active:scale-90"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-5 py-2 text-xs font-black text-gray-700 hover:bg-white hover:shadow-sm rounded-xl transition-all uppercase tracking-wider"
            >
              Today
            </button>
            <button
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all active:scale-90"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {syncing && (
            <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100 flex-none">
              <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider">
                Syncing
              </span>
            </div>
          )}
          <button
            onClick={handleDisconnect}
            className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all group border border-transparent hover:border-red-100"
            title="Disconnect Account"
          >
            <Unlink className="w-5.5 h-5.5" />
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-gray-900 hover:bg-black text-white px-6 py-3.5 rounded-2xl font-bold text-sm flex items-center gap-2 transition-all shadow-xl active:scale-95"
          >
            <Plus className="w-4 h-4" /> Create Event
          </button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 overflow-hidden">
        {/* Agenda Sidebar */}
        <div className="lg:col-span-1 border-r border-gray-100 bg-gray-50/20 overflow-y-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">
              Upcoming
            </h3>
            <span className="bg-gray-200/50 text-gray-500 text-[10px] font-black px-2 py-0.5 rounded-full">
              {events.length}
            </span>
          </div>

          {events.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-3xl border border-dashed border-gray-200 shadow-sm">
              <CalendarIcon className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400 font-bold tracking-tight">
                No Events Scheduled
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.slice(0, 10).map((event) => {
                const startTime = event.start.dateTime
                  ? parseISO(event.start.dateTime)
                  : event.start.date
                    ? parseISO(event.start.date)
                    : null;
                return (
                  <div
                    key={event.id}
                    className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:-translate-y-1"
                  >
                    <h4 className="font-bold text-gray-900 text-sm leading-tight group-hover:text-blue-600 transition-colors mb-2">
                      {event.summary}
                    </h4>
                    <div className="space-y-1">
                      {startTime && (
                        <div className="flex items-center gap-2 text-[10px] text-gray-500 font-black uppercase tracking-wider">
                          <Clock className="w-3 h-3 text-blue-400" />
                          {format(startTime, "HH:mm")} •{" "}
                          {format(startTime, "MMM d")}
                        </div>
                      )}
                      {event.hangoutLink && (
                        <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-600 text-[9px] font-black px-2 py-0.5 rounded-md mt-1">
                          <Video className="w-3 h-3" /> VIDEO CALL
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Grid */}
        <div className="lg:col-span-4 p-8 bg-white overflow-y-auto relative">
          <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-3xl border border-gray-200 overflow-hidden shadow-2xl">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <div key={day} className="bg-gray-50/80 p-5 text-center">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                  {day}
                </span>
              </div>
            ))}

            {calendarDays.map((day, idx) => {
              const dayEvents = getEventsForDay(day);
              const isSelectedMonth = isSameMonth(day, monthStart);
              const isCurrentDay = isToday(day);

              return (
                <div
                  key={idx}
                  className={`bg-white min-h-[140px] p-3 flex flex-col gap-2 transition-all hover:bg-gray-50/80 group relative
                                        ${!isSelectedMonth ? "opacity-30" : ""}
                                    `}
                >
                  <span
                    className={`text-xs font-black self-end w-7 h-7 flex items-center justify-center rounded-full transition-all
                                        ${isCurrentDay ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "text-gray-400 group-hover:text-gray-900"}
                                    `}
                  >
                    {format(day, "d")}
                  </span>

                  <div className="flex flex-col gap-1 overflow-y-auto max-h-[100px] scrollbar-hide">
                    {dayEvents.map((event) => (
                      <div
                        key={event.id}
                        className="bg-blue-50 border-l-2 border-blue-500 px-1.5 py-1 rounded shadow-sm group/event hover:bg-blue-100 transition-colors cursor-pointer"
                        title={event.summary}
                      >
                        <p className="text-[9px] font-bold text-blue-900 truncate tracking-tight">
                          {event.summary}
                        </p>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      setIsCreateModalOpen(true);
                      // Ideally pass starting date
                    }}
                    className="absolute bottom-2 left-2 p-1 rounded-md text-gray-200 hover:text-gray-400 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchEvents}
      />
    </div>
  );
}
