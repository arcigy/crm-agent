'use client';

import * as React from 'react';
import { Plus, Download, UserPlus } from 'lucide-react';

export function ContactActionButtons() {
    const openCreate = () => {
        window.dispatchEvent(new CustomEvent('open-create-contact'));
    };

    const openImport = () => {
        window.dispatchEvent(new CustomEvent('open-import-contact'));
    };

    return (
        <div className="flex items-center gap-3">
            <button
                onClick={openImport}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-all shadow-sm active:scale-95"
            >
                <Download className="w-3.5 h-3.5" />
                Import
            </button>
            <button
                onClick={openCreate}
                className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-gray-200 active:scale-95"
            >
                <UserPlus className="w-4 h-4" />
                New Contact
            </button>
        </div>
    );
}

// Separate component for the big buttons in the empty state
export function EmptyStateActions() {
    const openCreate = () => {
        window.dispatchEvent(new CustomEvent('open-create-contact'));
    };

    const openImport = () => {
        window.dispatchEvent(new CustomEvent('open-import-contact'));
    };

    return (
        <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
            <button
                onClick={openCreate}
                className="px-10 py-5 bg-gray-900 text-white rounded-2xl font-black uppercase italic tracking-[0.1em] shadow-2xl hover:bg-blue-600 transition-all active:scale-95 flex items-center gap-3"
            >
                <Plus className="w-5 h-5" />
                Create Manually
            </button>
            <button
                onClick={openImport}
                className="px-10 py-5 bg-white border-4 border-gray-100 text-gray-900 rounded-2xl font-black uppercase italic tracking-[0.1em] shadow-xl hover:border-blue-500 transition-all active:scale-95 flex items-center gap-3"
            >
                <Download className="w-5 h-5 text-blue-500" />
                Import Data
            </button>
        </div>
    );
}
