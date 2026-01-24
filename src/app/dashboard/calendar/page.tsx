'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CalendarHeader } from '@/components/calendar/CalendarHeader';
import { CalendarView } from '@/components/calendar/CalendarView';
import { GoogleConnectButton } from '@/components/calendar/GoogleConnectButton';
import { CreateEventModal } from '@/components/calendar/CreateEventModal';
import { EventDetailModal } from '@/components/calendar/EventDetailModal';
import { CalendarEvent, CalendarView as ViewType } from '@/types/calendar';
import { toast } from 'sonner';

function CalendarContent() {
    const searchParams = useSearchParams();
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [view, setView] = useState<ViewType>('month');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isLoading, setIsLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

    useEffect(() => {
        const dateParam = searchParams.get('date');
        if (dateParam) {
            const parsedDate = new Date(dateParam);
            if (!isNaN(parsedDate.getTime())) {
                setCurrentDate(parsedDate);
                setView('day');
            }
        }
    }, [searchParams]);

    const fetchEvents = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/google/calendar');
            const data = await res.json();

            if (data.isConnected) {
                setIsConnected(true);
                const formattedEvents = data.events.map((e: any) => ({
                    ...e,
                    start: new Date(e.start),
                    end: new Date(e.end)
                }));
                setEvents(formattedEvents);
            } else {
                setIsConnected(false);
            }
        } catch (error) {
            console.error('Error fetching events:', error);
            toast.error('Nepodarilo sa načítať udalosti');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    if (!isConnected && !isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
                <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 max-w-md w-full text-center space-y-6">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold text-gray-900">Synchronizujte svoj kalendár</h1>
                        <p className="text-gray-500 text-sm">Prepojte svoj Google Kalendár a spravujte všetky svoje úlohy a stretnutia priamo v CRM.</p>
                    </div>
                    <GoogleConnectButton />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <CalendarHeader
                currentDate={currentDate}
                view={view}
                onViewChange={setView}
                onPrev={() => {
                    const d = new Date(currentDate);
                    if (view === 'month') d.setMonth(d.getMonth() - 1);
                    else if (view === 'week') d.setDate(d.getDate() - 7);
                    else d.setDate(d.getDate() - 1);
                    setCurrentDate(d);
                }}
                onNext={() => {
                    const d = new Date(currentDate);
                    if (view === 'month') d.setMonth(d.getMonth() + 1);
                    else if (view === 'week') d.setDate(d.getDate() + 7);
                    else d.setDate(d.getDate() + 1);
                    setCurrentDate(d);
                }}
                onToday={() => setCurrentDate(new Date())}
                onCreateEvent={() => setIsCreateModalOpen(true)}
            />

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
            />

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center h-[600px]">
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
            </div>
        </div>
    );
}

export default function CalendarPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-[600px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        }>
            <CalendarContent />
        </Suspense>
    );
}
