'use client';

import * as React from 'react';
import { Search, ChevronDown, MoreHorizontal, Smartphone, FlaskConical } from 'lucide-react';
import Link from 'next/link';

interface ContactsTableToolbarProps {
    globalFilter: string;
    setGlobalFilter: (value: string) => void;
    totalCount: number;
    onNewClick: () => void;
    onImportClick: () => void;
    onTestClick?: () => void;
}

export function ContactsTableToolbar({
    globalFilter,
    setGlobalFilter,
    totalCount,
    onNewClick,
    onImportClick,
    onTestClick
}: ContactsTableToolbarProps) {
    return (
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 px-5 py-4 border-b border-violet-900/30 bg-zinc-950/40 backdrop-blur-md">
            <div className="flex items-center gap-2.5 flex-wrap">
                {/* Main Action Button */}
                <button
                    onClick={onNewClick}
                    className="group relative px-4 py-2 rounded-xl font-bold text-white text-[13px] tracking-wide transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-violet-900/20 flex items-center gap-1.5 overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 transition-all duration-300 group-hover:opacity-90" />
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-[linear-gradient(rgba(255,255,255,0.2)_0%,_transparent_100%)] transition-opacity duration-300 pointer-events-none" />
                    <span className="relative z-10 flex items-center gap-1">
                        Nový <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                    </span>
                </button>

                {/* Secondary Actions */}
                <button
                    onClick={onImportClick}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-[13px] font-bold transition-all active:scale-95 shadow-sm"
                >
                    Import vCard
                </button>

                <div className="h-5 w-px bg-white/10 mx-1"></div>

                {/* Search Input - Glassmorphic */}
                <div className="relative group">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-violet-400 transition-colors" />
                    <input
                        type="text"
                        placeholder="Hľadať kontakty..."
                        value={globalFilter ?? ''}
                        onChange={(e) => setGlobalFilter(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-black/40 border border-white/10 hover:border-violet-500/30 rounded-xl text-[13px] text-white w-48 lg:w-64 focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/60 transition-all font-medium placeholder:text-white/30"
                    />
                </div>

                <div className="h-5 w-px bg-white/10 mx-1 lg:mx-2 hidden lg:block"></div>

                {/* System Actions */}
                <div className="flex items-center gap-2">
                    <Link href="/dashboard/settings/sync">
                        <button className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-[11px] lg:text-[13px] font-bold border border-emerald-500/20 transition-all">
                            <Smartphone className="w-4 h-4" />
                            <span className="hidden sm:inline">Sync to Mobile</span>
                        </button>
                    </Link>
                    <button 
                        onClick={onTestClick}
                        className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-xl text-[11px] lg:text-[13px] font-bold border border-amber-500/20 transition-all"
                    >
                        <FlaskConical className="w-4 h-4" />
                        <span className="hidden sm:inline">Test</span>
                    </button>
                </div>
            </div>

            {/* Right side stats & settings */}
            <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                <div className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center">
                    <span className="text-[11px] font-black text-white/50 uppercase tracking-widest">
                        Spolu: <span className="text-violet-400">{totalCount}</span>
                    </span>
                </div>
                <button className="p-2 bg-white/5 hover:bg-violet-900/40 border border-white/5 hover:border-violet-500/30 rounded-xl text-white/60 hover:text-white transition-all">
                    <MoreHorizontal className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
