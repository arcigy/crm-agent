'use client';

import { format } from 'date-fns';
import { sk } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, Plus } from 'lucide-react';
import { CalendarView } from '@/types/calendar';

interface CalendarHeaderProps {
    currentDate: Date;
    view: CalendarView;
    onViewChange: (view: CalendarView) => void;
    onPrev: () => void;
    onNext: () => void;
    onToday: () => void;
    onCreateEvent: () => void;
}

export function CalendarHeader({
    currentDate,
    view,
    onViewChange,
    onPrev,
    onNext,
    onToday,
    onCreateEvent
}: CalendarHeaderProps) {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-4">
                <div className="flex items-center bg-gray-50 rounded-lg p-1 border border-gray-200">
                    <button
                        onClick={onPrev}
                        className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-600"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button
                        onClick={onToday}
                        className="px-4 py-1.5 text-sm font-medium hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-700"
                    >
                        Dnes
                    </button>
                    <button
                        onClick={onNext}
                        className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-600"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>

                <h2 className="text-xl font-bold text-gray-900 capitalize min-w-[200px]">
                    {format(currentDate, view === 'month' ? 'LLLL yyyy' : 'd. MMMM yyyy', { locale: sk })}
                </h2>
            </div>

            <div className="flex items-center gap-3">
                <div className="flex items-center bg-gray-50 rounded-lg p-1 border border-gray-200">
                    {(['month', 'week', 'day'] as CalendarView[]).map((v) => (
                        <button
                            key={v}
                            onClick={() => onViewChange(v)}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${view === v
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {v === 'month' ? 'Mesiac' : v === 'week' ? 'Týždeň' : 'Deň'}
                        </button>
                    ))}
                </div>

                <div className="h-8 w-px bg-gray-200 mx-1 hidden md:block" />

                <button
                    onClick={onCreateEvent}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-md shadow-blue-200 active:scale-95"
                >
                    <Plus size={18} />
                    <span className="hidden sm:inline">Nová udalosť</span>
                </button>
            </div>
        </div>
    );
}
