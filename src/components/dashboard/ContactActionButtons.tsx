'use client';

import * as React from 'react';
import { Plus, Download, UserPlus, Code, FileText, ChevronDown, RefreshCcw } from 'lucide-react';

export function ContactActionButtons() {
    const [isOpen, setIsOpen] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const trigger = (eventName: string, mode?: string) => {
        window.dispatchEvent(new CustomEvent(eventName, { detail: mode }));
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-gray-200 active:scale-95 group"
            >
                <Plus className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`} />
                Pridať
                <ChevronDown className={`w-3 h-3 ml-1 opacity-50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-[100] animate-in fade-in zoom-in-95 duration-200">
                    <button
                        onClick={() => trigger('open-create-contact', 'form')}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors group"
                    >
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <UserPlus className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[11px] font-black uppercase tracking-tight text-gray-900 leading-none">Manuálny formulár</span>
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">Štandardný zápis</span>
                        </div>
                    </button>

                    <button
                        onClick={() => trigger('open-create-contact', 'json')}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors group"
                    >
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                            <Code className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[11px] font-black uppercase tracking-tight text-gray-900 leading-none">RAW Extrakcia</span>
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">JSON / Text / NV</span>
                        </div>
                    </button>

                    <div className="h-px bg-gray-50 my-1 mx-2"></div>

                    <button
                        onClick={() => trigger('open-import-contact')}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors group"
                    >
                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-500 group-hover:bg-gray-900 group-hover:text-white transition-colors">
                            <Download className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[11px] font-black uppercase tracking-tight text-gray-900 leading-none">Import súboru</span>
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">vCard / CSV / Excel</span>
                        </div>
                    </button>

                    <button
                        onClick={() => trigger('open-import-google')}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-blue-50 transition-colors group border-t border-gray-50 mt-1"
                    >
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <RefreshCcw className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[11px] font-black uppercase tracking-tight text-gray-900 leading-none">Google Sync</span>
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">Automatický import</span>
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
}

export function EmptyStateActions() {
    return (
        <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
            <ContactActionButtons />
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] italic">Alebo vyberte automatizovaný zdroj</p>
        </div>
    );
}
