"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarHeader } from "@/components/calendar/CalendarHeader";
import { CalendarSidebar } from "@/components/calendar/CalendarSidebar";
import { CalendarView } from "@/components/calendar/CalendarView";
import { GoogleConnectButton } from "@/components/dashboard/GoogleConnectButton";
import { CreateEventModal } from "@/components/calendar/CreateEventModal";
import { EventDetailModal } from "@/components/calendar/EventDetailModal";
import { ContactDetailModal } from "@/components/dashboard/ContactDetailModal";
import { CalendarEvent, CalendarView as ViewType } from "@/types/calendar";
import { Lead } from "@/types/contact";
import { toast } from "sonner";

function CalendarContent() {
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [view, setView] = useState<ViewType>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null,
  );
  const [viewContact, setViewContact] = useState<Lead | null>(null);
  const [activeLayers, setActiveLayers] = useState<string[]>([
    "primary",
    "birthdays",
    "tasks",
    "holidays",
  ]);

  useEffect(() => {
    const dateParam = searchParams?.get("date");
    if (dateParam) {
      const parsedDate = new Date(dateParam);
      if (!isNaN(parsedDate.getTime())) {
        setCurrentDate(parsedDate);
        setView("day");
      }
    }
  }, [searchParams]);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch("/api/google/calendar", {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json();

      if (data.isConnected) {
        setIsConnected(true);
        const formattedEvents = (data.events || []).map((e: any) => ({
          ...e,
          start: new Date(e.start),
          end: new Date(e.end),
        }));
        setEvents(formattedEvents);
      } else {
        setIsConnected(false);
      }
    } catch (error: any) {
      console.error("Error fetching events:", error);
      if (error.name === "AbortError") {
        toast.error("Načítanie kalendára trvá príliš dlho");
      } else {
        toast.error("Nepodarilo sa načítať udalosti");
      }
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const toggleLayer = (layerId: string) => {
    setActiveLayers((prev) =>
      prev.includes(layerId)
        ? prev.filter((id) => id !== layerId)
        : [...prev, layerId],
    );
  };

  if (!isConnected && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
            <svg
              className="w-8 h-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">
              Synchronizujte svoj kalendár
            </h1>
            <p className="text-gray-500 text-sm">
              Prepojte svoj Google Kalendár a spravujte všetky svoje úlohy a
              stretnutia priamo v CRM.
            </p>
          </div>
          <GoogleConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col bg-white overflow-hidden shadow-2xl rounded-[3rem] border border-border">
      <CalendarHeader
        currentDate={currentDate}
        view={view}
        onViewChange={setView}
        onPrev={() => {
          const d = new Date(currentDate);
          if (view === "month") d.setMonth(d.getMonth() - 1);
          else if (view === "week") d.setDate(d.getDate() - 7);
          else if (view === "4days") d.setDate(d.getDate() - 4);
          else if (view === "year") d.setFullYear(d.getFullYear() - 1);
          else d.setDate(d.getDate() - 1);
          setCurrentDate(d);
        }}
        onNext={() => {
          const d = new Date(currentDate);
          if (view === "month") d.setMonth(d.getMonth() + 1);
          else if (view === "week") d.setDate(d.getDate() + 7);
          else if (view === "4days") d.setDate(d.getDate() + 4);
          else if (view === "year") d.setFullYear(d.getFullYear() + 1);
          else d.setDate(d.getDate() + 1);
          setCurrentDate(d);
        }}
        onToday={() => setCurrentDate(new Date())}
        onCreateEvent={() => setIsCreateModalOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="hidden lg:block w-72 border-r border-gray-200 p-4 overflow-y-auto thin-scrollbar">
          <CalendarSidebar
            currentDate={currentDate}
            onDateSelect={(date) => {
              setCurrentDate(date);
              if (view === "month") setView("day");
            }}
            activeLayers={activeLayers}
            onLayerToggle={toggleLayer}
          />
        </div>

        <main className="flex-1 flex flex-col overflow-hidden relative">
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            }
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <CalendarView
                view={view}
                currentDate={currentDate}
                events={events}
                onEventClick={(event) => {
                  setSelectedEvent(event);
                }}
              />
            )}
          </Suspense>
        </main>
      </div>

      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchEvents}
        initialDate={currentDate}
      />

      <EventDetailModal
        event={selectedEvent}
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onOpenContact={(contact) => setViewContact(contact)}
      />

      <ContactDetailModal
        contact={viewContact}
        isOpen={!!viewContact}
        onClose={() => setViewContact(null)}
      />
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[600px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <CalendarContent />
    </Suspense>
  );
}
