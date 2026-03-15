"use client";

import { useState, useEffect, Suspense } from "react";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCurrentCRMUser } from "@/hooks/useCurrentCRMUser";
import { useUser } from "@clerk/nextjs";
import { CalendarHeader } from "@/components/calendar/CalendarHeader";
import { CalendarSidebar } from "@/components/calendar/CalendarSidebar";
import { CalendarView } from "@/components/calendar/CalendarView";
import { GoogleConnectButton } from "@/components/dashboard/GoogleConnectButton";
import { CreateEventModal } from "@/components/calendar/CreateEventModal";
import { EventDetailModal } from "@/components/calendar/EventDetailModal";
import { ContactDetailModal } from "@/components/dashboard/ContactDetailModal";
import { CalendarEvent, CalendarView as ViewType } from "@/types/calendar";
import { format } from "date-fns";
import { Lead } from "@/types/contact";
import { toast } from "sonner";
import { Loader2, Calendar as CalendarIcon } from "lucide-react";

const MOCK_EVENTS: CalendarEvent[] = [
  {
    id: "1",
    title: "STRATEGICKÉ PLÁNOVANIE Q2",
    start: new Date(new Date().setHours(10, 0)),
    end: new Date(new Date().setHours(12, 0)),
    description: "Plánovanie cieľov a rozpočtu pre druhý kvartál"
  },
  {
    id: "2",
    title: "PRODUCT REVIEW - AI AGENT",
    start: new Date(new Date().setDate(new Date().getDate() + 1)),
    end: new Date(new Date().setDate(new Date().getDate() + 1)),
    allDay: true,
    description: "Prezentácia výsledkov vývoja AI agenta"
  },
  {
    id: "3",
    title: "KLIENTSKÝ WORKSHOP",
    start: new Date(new Date().setHours(14, 30)),
    end: new Date(new Date().setHours(16, 0)),
  },
  {
      id: "4",
      title: "BRAINSTORMING DIZAJNU",
      start: new Date(new Date().setDate(new Date().getDate() - 1)),
      end: new Date(new Date().setDate(new Date().getDate() - 1)),
      allDay: true,
  }
];

function CalendarContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
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
    "tasks",
  ]);
  const [modalDate, setModalDate] = useState<Date | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");
  const [onlyDeals, setOnlyDeals] = useState(false);
  const [highlightFree, setHighlightFree] = useState(false);
  const [devEvents, setDevEvents] = useState<CalendarEvent[]>([]);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [isRealConnected, setIsRealConnected] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncCounts, setSyncCounts] = useState({ google: 0, crm: 0 });

  const { user, isLoaded } = useCurrentCRMUser();

  const handleConnect = async () => {
    if (!isLoaded || !user) return;
    try {
        const res = await fetch('/api/google/auth-url');
        const { url } = await res.json();
        if (url) {
            window.location.href = url;
        } else {
            throw new Error("Nepodarilo sa vygenerovať autorizačnú URL");
        }
    } catch (error: any) {
        console.error('Failed to connect Google Calendar:', error);
        toast.error('Nepodarilo sa prepojiť s Google');
    }
  };

  // Sync URL -> State (for browser back/forward buttons)
  useEffect(() => {
    const dateParam = searchParams?.get("date");
    const viewParam = searchParams?.get("view");

    if (dateParam) {
      const parsedDate = new Date(dateParam);
      if (!isNaN(parsedDate.getTime())) {
        const dStr = format(parsedDate, "yyyy-MM-dd");
        const currentStr = format(currentDate, "yyyy-MM-dd");
        if (dStr !== currentStr) {
          setCurrentDate(parsedDate);
        }
      }
    }
    
    if (viewParam && viewParam !== view) {
      setView(viewParam as ViewType);
    }
  }, [searchParams]);

  // Helper to update URL and State (creates history entry)
  const navigateCalendar = (newDate: Date, newView: ViewType) => {
    const params = new URLSearchParams(searchParams?.toString());
    params.set("date", format(newDate, "yyyy-MM-dd"));
    params.set("view", newView);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
    
    setCurrentDate(newDate);
    setView(newView);
  };

  // Persistence for devEvents
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('crm_dev_events');
      if (saved) {
        try {
          const parsed = JSON.parse(saved).map((e: any) => ({
            ...e,
            start: new Date(e.start),
            end: new Date(e.end)
          }));
          setDevEvents(parsed);
          setEvents(parsed);
        } catch (e) {
          console.error("Failed to parse saved dev events", e);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (devEvents.length > 0) {
      localStorage.setItem('crm_dev_events', JSON.stringify(devEvents));
    }
  }, [devEvents]);

  const fetchEvents = async (silent = false) => {
    if (!silent) setIsLoading(true);
    setIsSyncing(true);
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
        setIsRealConnected(true);
        const formattedEvents = (data.events || []).map((e: any) => ({
          ...e,
          title: e.summary || e.title || "Bez názvu",
          start: new Date(e.start.dateTime || e.start.date || e.start),
          end: new Date(e.end.dateTime || e.end.date || e.end),
          allDay: !!e.start.date && !e.start.dateTime
        }));
        
        const crmCount = formattedEvents.filter((e: any) => 
          e.id.toString().startsWith('p-') || 
          e.id.toString().startsWith('d-') || 
          e.id.toString().startsWith('t-')
        ).length;
        
        setEvents(formattedEvents);
        setSyncCounts({ 
          google: formattedEvents.length - crmCount, 
          crm: crmCount 
        });
        setLastSyncTime(new Date());
      } else {
        setIsRealConnected(false);
        if (process.env.NODE_ENV === 'development') {
            setIsConnected(true);
            // If we have devEvents in state (loaded from localStorage), use those
            if (devEvents.length > 0) {
              setEvents(devEvents);
              setSyncCounts({ google: devEvents.length, crm: 0 });
            } else {
              setDevEvents(MOCK_EVENTS);
              setEvents(MOCK_EVENTS);
              setSyncCounts({ google: MOCK_EVENTS.length, crm: 0 });
            }
            setLastSyncTime(new Date());
        } else {
            setIsConnected(false);
        }
      }
    } catch (error: any) {
      console.error("Error fetching events:", error);
      if (process.env.NODE_ENV === 'development') {
          setIsConnected(true);
          setEvents(devEvents.length > 0 ? devEvents : MOCK_EVENTS);
          setLastSyncTime(new Date());
      } else {
          setIsConnected(false);
      }
    } finally {
      if (!silent) setIsLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    
    // Background sync every 5 minutes
    const interval = setInterval(() => {
      fetchEvents(true);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [devEvents.length === 0]); 

  const toggleLayer = (layerId: string) => {
    if (layerId === 'sync') {
      fetchEvents();
      return;
    }
    setActiveLayers((prev) =>
      prev.includes(layerId)
        ? prev.filter((id) => id !== layerId)
        : [...prev, layerId],
    );
  };

  if (!isConnected && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
        <div className="bg-zinc-900 shadow-2xl rounded-[3rem] border border-violet-500/10 max-w-xl w-full p-12 text-center relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/10 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          
          <div className="relative z-10 space-y-8">
            <div className="w-20 h-20 bg-violet-500/10 text-violet-500 rounded-3xl flex items-center justify-center mx-auto border border-violet-500/20 shadow-[0_0_30px_rgba(139,92,246,0.15)] group hover:scale-110 transition-transform">
                <CalendarIcon className="w-10 h-10 group-hover:rotate-12 transition-transform" />
            </div>
            
            <div className="space-y-3">
              <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">
                Sync <span className="text-violet-500">Vault</span>
              </h1>
              <p className="text-zinc-500 text-sm font-medium tracking-tight max-w-sm mx-auto leading-relaxed">
                PREPOJTE SVOJ GOOGLE KALENDÁR A SPRAVUJTE VŠETKY SVOJE ÚLOHY A STRETNUTIA PRIAMO V PRÉMIOVOM CRM PROSTREDÍ.
              </p>
            </div>
            
            <div className="pt-4">
                <GoogleConnectButton />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-[#050507] overflow-hidden rounded-[2rem] border border-white/[0.03] shadow-2xl transition-all duration-700 relative">
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-violet-600/[0.03] blur-[150px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <CalendarHeader
        currentDate={currentDate}
        view={view}
        onViewChange={(v) => navigateCalendar(currentDate, v)}
        onPrev={() => {
          const d = new Date(currentDate);
          if (view === "month") d.setMonth(d.getMonth() - 1);
          else if (view === "week") d.setDate(d.getDate() - 7);
          else if (view === "workweek") d.setDate(d.getDate() - 5);
          else if (view === "year") d.setFullYear(d.getFullYear() - 1);
          else d.setDate(d.getDate() - 1);
          navigateCalendar(d, view);
        }}
        onNext={() => {
          const d = new Date(currentDate);
          if (view === "month") d.setMonth(d.getMonth() + 1);
          else if (view === "week") d.setDate(d.getDate() + 7);
          else if (view === "workweek") d.setDate(d.getDate() + 5);
          else if (view === "year") d.setFullYear(d.getFullYear() + 1);
          else d.setDate(d.getDate() + 1);
          navigateCalendar(d, view);
        }}
        onToday={() => navigateCalendar(new Date(), view)}
        onCreateClick={() => setIsCreateModalOpen(true)}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onlyDeals={onlyDeals}
        onOnlyDealsToggle={() => setOnlyDeals(!onlyDeals)}
        highlightFree={highlightFree}
        onHighlightFreeToggle={() => setHighlightFree(!highlightFree)}
        onSettingsClick={() => window.location.href = '/dashboard/settings'}
        onSyncClick={fetchEvents}
        onDateSelect={(d) => navigateCalendar(d, view)}
      />

      <div className="flex flex-1 overflow-hidden relative z-10">
        <div className="hidden lg:block w-80 border-r border-white/5 p-4 overflow-y-auto scrollbar-hide bg-black/20">
          <CalendarSidebar
            currentDate={currentDate}
            onDateSelect={(date) => {
              setCurrentDate(date);
            }}
            activeLayers={isSyncing ? [...activeLayers, 'syncing'] : activeLayers}
            onLayerToggle={toggleLayer}
            onCreateClick={() => setIsCreateModalOpen(true)}
            isConnected={isRealConnected}
            onConnect={handleConnect}
            onDateDoubleClick={(date) => {
              navigateCalendar(date, "day");
            }}
            lastSyncTime={lastSyncTime}
            syncCounts={syncCounts}
          />
        </div>

        <main className="flex-1 flex flex-col overflow-hidden relative">
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-10 h-10 text-violet-600 animate-spin" />
              </div>
            }
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-10 h-10 text-violet-600 animate-spin" />
              </div>
            ) : (
              <CalendarView
                view={view}
                currentDate={currentDate}
                highlightFree={highlightFree}
                events={events.filter(e => {
                  const matchesSearch = searchTerm ? (
                    e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    e.description?.toLowerCase().includes(searchTerm.toLowerCase())
                  ) : true;
                  
                  const isBusinessItem = 
                    e.id.toString().startsWith('p-') || 
                    e.id.toString().startsWith('d-') || 
                    ['project', 'deal'].includes(e.extendedProperties?.private?.type || '') ||
                    ['project', 'deal'].includes((e as any).type || '') ||
                    e.title.toLowerCase().includes('#biznis') ||
                    e.title.toLowerCase().includes('#deal');
                  
                  // Filter by deals if active
                  if (onlyDeals && !isBusinessItem) return false;

                  const layerId = isBusinessItem ? 'tasks' : 'primary';
                  const matchesLayer = activeLayers.includes(layerId);
                  
                  return matchesSearch && matchesLayer;
                })}
                onEventClick={(event) => {
                  setSelectedEvent(event);
                }}
                onDateClick={(date) => {
                  setModalDate(date);
                  setIsCreateModalOpen(true);
                }}
              />
            )}
          </Suspense>
        </main>
      </div>

      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setModalDate(undefined);
          setEditingEvent(null);
        }}
        onSuccess={(newEvent) => {
          if (process.env.NODE_ENV === 'development' && newEvent) {
             const formatted = {
               ...newEvent,
               title: newEvent.summary || newEvent.title || "Bez názvu",
               start: new Date(newEvent.start.dateTime || newEvent.start.date || newEvent.start),
               end: new Date(newEvent.end.dateTime || newEvent.end.date || newEvent.end),
               allDay: newEvent.start.date && !newEvent.start.dateTime
             };
             
             let updated;
             if (editingEvent) {
               updated = devEvents.map(e => e.id === formatted.id ? formatted : e);
             } else {
               updated = [formatted, ...devEvents];
             }
             
             setDevEvents(updated);
             setEvents(updated);
          }
          fetchEvents();
        }}
        initialDate={modalDate || currentDate}
        initialEvent={editingEvent}
      />

      <EventDetailModal
        event={selectedEvent}
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onSuccess={() => {
          if (process.env.NODE_ENV === 'development' && selectedEvent) {
             const newEvents = devEvents.filter(e => e.id !== selectedEvent.id);
             setDevEvents(newEvents);
             setEvents(newEvents);
          }
          fetchEvents();
        }}
        onOpenContact={(contact) => setViewContact(contact)}
        onEdit={(event) => {
          setEditingEvent(event);
          setIsCreateModalOpen(true);
        }}
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
