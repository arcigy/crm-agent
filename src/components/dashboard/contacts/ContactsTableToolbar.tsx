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
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 dark:border-white/5 bg-card/50 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 flex-wrap">
                <button
                    onClick={onNewClick}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 shadow-sm transition-all active:scale-95"
                >
                    New <ChevronDown className="w-3 h-3 opacity-70" />
                </button>
                <button
                    onClick={onImportClick}
                    className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-all active:scale-95 shadow-sm"
                >
                    Import vCard
                </button>
                <div className="h-3 w-px bg-gray-300 mx-1"></div>
                <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search all columns..."
                        value={globalFilter ?? ''}
                        onChange={(e) => setGlobalFilter(e.target.value)}
                        className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs w-48 lg:w-56 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-medium placeholder:text-gray-400"
                    />
                </div>
                <div className="h-4 w-px bg-gray-200 mx-1 lg:mx-2"></div>
                <div className="flex items-center gap-1.5">
                    <Link href="/dashboard/settings/sync">
                        <button className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10px] lg:text-xs font-bold border border-emerald-200 transition-all">
                            <Smartphone className="w-3.5 h-3.5" />
                            Sync to Mobile
                        </button>
                    </Link>
                    <button 
                        onClick={onTestClick}
                        className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-[10px] lg:text-xs font-bold border border-amber-200 transition-all"
                    >
                        <FlaskConical className="w-3.5 h-3.5" />
                        Test update
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-1.5">
                <div className="text-[10px] font-bold text-gray-400 uppercase mr-2 tracking-widest hidden lg:block">Total: {totalCount}</div>
                <button className="p-2 hover:bg-gray-100 rounded-md text-gray-400 transition-colors">
                    <MoreHorizontal className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
