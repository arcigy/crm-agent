'use client';

import * as React from 'react';
import { Search, ChevronDown, MoreVertical, Smartphone, FlaskConical, Users, Download, RotateCcw, FilterX } from 'lucide-react';
import Link from 'next/link';
import { toast } from "sonner";

interface ContactsTableToolbarProps {
    globalFilter: string;
    setGlobalFilter: (value: string) => void;
    totalCount: number;
    onNewClick: () => void;
    onImportClick: () => void;
    onExport: () => void;
    onRefresh: () => void;
    onTestClick?: () => void;
}

export function ContactsTableToolbar({
    globalFilter,
    setGlobalFilter,
    totalCount,
    onNewClick,
    onImportClick,
    onExport,
    onRefresh,
    onTestClick
}: ContactsTableToolbarProps) {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const menuRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        }
        if (isMenuOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isMenuOpen]);

    return (
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 px-6 py-4 border-b border-white/5 bg-black/40 backdrop-blur-xl relative z-[100]">
            {/* Left side actions */}
            <div className="flex items-center gap-4 shrink-0 w-full lg:w-auto">
                <button
                    onClick={onNewClick}
                    className="group relative px-6 py-3 rounded-2xl font-[900] text-white text-xs tracking-[0.2em] uppercase italic transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(139,92,246,0.2)] flex items-center justify-center overflow-hidden w-full lg:w-auto"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 transition-all duration-300 group-hover:opacity-90" />
                    <span className="relative z-10 block line-clamp-1 whitespace-nowrap">
                        Nový
                    </span>
                </button>
            </div>

            {/* Middle Search Bar */}
            <div className="flex-1 w-full max-w-3xl px-2">
                <div className="relative group w-full">
                    <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-violet-400 transition-all" />
                    <input
                        type="text"
                        placeholder="Rýchle hľadanie v kontaktoch..."
                        value={globalFilter ?? ''}
                        onChange={(e) => setGlobalFilter(e.target.value)}
                        className="pl-12 pr-6 py-3.5 bg-white/5 border border-white/5 hover:border-violet-500/30 rounded-2xl text-xs text-white w-full focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/60 transition-all font-black placeholder:text-white/10 tracking-widest shadow-inner"
                    />
                </div>
            </div>

            {/* Right side stats & settings */}
            <div className="flex items-center gap-4 shrink-0 w-full lg:w-auto justify-center lg:justify-end">
                {/* Modern Neon Stats Pill */}
                <div className="group/stats relative h-10 px-5 flex items-center gap-3 bg-violet-500/10 border border-violet-500/40 rounded-full shadow-[0_0_15px_rgba(139,92,246,0.1)] hover:shadow-[0_0_25px_rgba(139,92,246,0.2)] transition-all duration-500 hover:border-violet-500 hover:bg-violet-500/20 cursor-default">
                    <div className="absolute inset-0 rounded-full bg-violet-500/5 opacity-50" />
                    <div className="relative flex items-center justify-center">
                        <div className="absolute inset-0 bg-violet-500 blur-[8px] opacity-40 group-hover/stats:opacity-100 transition-opacity" />
                        <Users className="w-4 h-4 text-violet-100 relative z-10" strokeWidth={2.5} />
                    </div>
                    <div className="h-4 w-px bg-violet-500/30" />
                    <div className="flex flex-col">
                        <span className="text-[14px] font-[900] text-white tracking-tight leading-none italic">
                            {totalCount}
                            <span className="ml-1.5 text-[8px] font-black uppercase tracking-widest not-italic text-violet-400">KONTAKTY</span>
                        </span>
                    </div>
                </div>

                <div className="relative" ref={menuRef}>
                    <button 
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all border ${isMenuOpen ? 'bg-transparent border-violet-500 text-violet-500 rotate-90' : 'bg-transparent border-transparent text-white/30 hover:text-violet-500 hover:scale-110 active:scale-95'}`}
                    >
                        <MoreVertical className="w-5 h-5" />
                    </button>

                    {isMenuOpen && (
                        <div className="absolute right-0 mt-3 w-48 bg-[#0a0a0c] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-[120] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-1.5 py-2 space-y-0.5">
                                <button 
                                    onClick={() => {
                                        onImportClick();
                                        setIsMenuOpen(false);
                                    }}
                                    className="w-full text-left px-3 py-2 text-[11px] font-[900] text-white/60 hover:text-white hover:bg-violet-600 rounded-xl transition-all uppercase tracking-widest flex items-center gap-3 group"
                                >
                                    <Smartphone className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" />
                                    VCard Import
                                </button>
                                <button 
                                    onClick={() => {
                                        onExport();
                                        setIsMenuOpen(false);
                                    }}
                                    className="w-full text-left px-3 py-2 text-[11px] font-[900] text-white/60 hover:text-white hover:bg-violet-600 rounded-xl transition-all uppercase tracking-widest flex items-center gap-3 group"
                                >
                                    <Download className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" />
                                    Export CSV
                                </button>
                                <button 
                                    onClick={() => {
                                        onRefresh();
                                        setIsMenuOpen(false);
                                    }}
                                    className="w-full text-left px-3 py-2 text-[11px] font-[900] text-white/60 hover:text-white hover:bg-violet-600 rounded-xl transition-all uppercase tracking-widest flex items-center gap-3 group"
                                >
                                    <RotateCcw className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" />
                                    Refresh Data
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
