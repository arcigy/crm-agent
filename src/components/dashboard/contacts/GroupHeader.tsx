'use client';

import * as React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Row } from '@tanstack/react-table';
import { Lead } from '@/types/contact';

interface GroupHeaderProps {
    row: Row<Lead>;
    columnsCount: number;
}

export function GroupHeader({ row, columnsCount }: GroupHeaderProps) {
    const status = String(row.original?.status || '').toLowerCase();
    const { setNodeRef, isOver } = useDroppable({
        id: `group-${status}`,
        data: {
            type: 'group',
            status: status === 'published' ? 'published' : 'draft'
        }
    });

    return (
        <tr ref={setNodeRef} key={row.id} className={`bg-white/50 hover:bg-gray-50 transition-colors ${isOver ? 'bg-blue-50 ring-2 ring-blue-500 ring-inset' : ''}`}>
            <td colSpan={columnsCount + 3} className="p-4">
                <div
                    className="flex items-center gap-2 cursor-pointer select-none group"
                    onClick={row.getToggleExpandedHandler()}
                >
                    <div className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 transition-colors">
                        {row.getIsExpanded() ? (
                            <ChevronDown className="w-4 h-4 text-gray-600 transition-transform" />
                        ) : (
                            <ChevronRight className="w-4 h-4 text-gray-600 transition-transform" />
                        )}
                    </div>

                    <div className={`
                        flex items-center gap-2 px-3 py-1 rounded-md text-sm font-black tracking-tight transition-all
                        ${status === 'published' ? 'text-green-700 bg-green-50' : 'text-gray-700 bg-gray-50'}
                        ${isOver ? 'scale-110 shadow-lg' : ''}
                    `}>
                        {status === 'published' ? 'Active Participants' : 'Inactive Pipeline'}
                        <span className="font-bold text-gray-400/60 ml-1 text-xs px-1.5 py-0.5 bg-white rounded border border-gray-100">
                            {row.subRows.length}
                        </span>
                        {isOver && <span className="ml-2 animate-pulse text-[10px] uppercase">Drop to change status</span>}
                    </div>
                    <div className="h-px bg-gray-100 flex-1 ml-4 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
            </td>
        </tr>
    );
}
