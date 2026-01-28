'use client';

import * as React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { flexRender, Row } from '@tanstack/react-table';
import { Lead } from '@/types/contact';

interface DraggableRowProps {
    row: Row<Lead>;
}

export function DraggableRow({ row }: DraggableRowProps) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `row-${row.original.id}`,
        data: {
            type: 'row',
            contact: row.original,
        }
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 1000,
        opacity: isDragging ? 0.5 : 1,
    } : undefined;

    return (
        <tr
            ref={setNodeRef}
            style={style}
            key={row.id}
            className={`group bg-white hover:bg-blue-50/30 transition-colors relative ${isDragging ? 'shadow-2xl ring-2 ring-blue-500/20' : ''}`}
        >
            {/* Color strip indicator */}
            <td className="p-0 relative w-2">
                <div className={`absolute inset-y-0.5 left-0 w-1.5 rounded-r-md 
                    ${String(row.original.status).toLowerCase() === 'published' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-gray-300'}
                `}></div>
            </td>
            {/* Drag handle */}
            <td className="p-2 text-center w-8">
                <div
                    {...attributes}
                    {...listeners}
                    className="opacity-100 cursor-grab active:cursor-grabbing text-gray-400 hover:text-blue-500 transition-all p-1 hover:bg-blue-50 rounded"
                >
                    ⠿
                </div>
            </td>
            {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="px-3 py-1 border-r border-gray-50 last:border-0 text-xs text-gray-700 relative group/cell hover:bg-white/80 transition-colors">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
            ))}
            {/* Add Column Button Placeholder */}
            <td className="p-2 border-l border-gray-50 text-center">
                <div className="w-6 h-6 rounded-full hover:bg-gray-200 flex items-center justify-center cursor-pointer transition-colors mx-auto group-hover:scale-110">
                    <span className="text-gray-300 text-xs">+</span>
                </div>
            </td>
        </tr>
    );
}
