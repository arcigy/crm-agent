"use client";

import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { flexRender, Row } from "@tanstack/react-table";
import { Lead } from "@/types/contact";

interface DraggableRowProps {
  row: Row<Lead>;
}

export const DraggableRow = React.memo(({ row }: DraggableRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useSortable({
    id: `row-${row.original.id}`,
    data: {
      type: "row",
      contact: row.original,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition: isDragging ? undefined : 'none', // No animation when dropping
    zIndex: isDragging ? 1000 : undefined,
    opacity: isDragging ? 0.8 : 1,
    position: "relative" as const,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      key={row.id}
      className={`group bg-transparent hover:bg-violet-900/10 transition-all duration-150 relative ${isDragging ? "z-[2000] shadow-2xl ring-2 ring-violet-500/30 bg-zinc-900/90 scale-[1.01]" : "hover:z-[100] focus-within:z-[100]"}`}
    >
      {/* Unified Control Gutter */}
      <td style={{ width: "54px" }} className="p-0 border-r border-white/5 z-10 bg-inherit group/gutter">
        <div className="flex items-center justify-center gap-1.5 h-full px-1">
          {/* Selection */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              row.toggleSelected();
            }}
            className={`w-4 h-4 shrink-0 rounded-md border transition-all flex items-center justify-center ${
              row.getIsSelected()
                ? "bg-violet-600 border-violet-600 shadow-[0_0_10px_rgba(124,58,237,0.4)]"
                : "border-white/20 hover:border-violet-400/50"
            }`}
          >
            {row.getIsSelected() && (
              <div className="w-1.5 h-1.5 bg-white rounded-full" />
            )}
          </button>

          {/* Color Strip */}
          <div className="relative h-6 w-1 shrink-0">
            <div
              className={`absolute inset-y-0 left-0 w-1 rounded-full 
                        ${String(row.original.status).toLowerCase() === "published" || String(row.original.status).toLowerCase() === "active" ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-zinc-800 opacity-50"}
                    `}
            ></div>
          </div>

          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="opacity-0 group-hover/gutter:opacity-100 cursor-grab active:cursor-grabbing text-white/30 hover:text-violet-400 transition-all p-0.5 text-[10px]"
          >
            ⠿
          </div>
        </div>
      </td>
      {row.getVisibleCells().map((cell) => (
        <td
          key={cell.id}
          className={`px-2 py-1 border-r border-white/5 last:border-0 text-xs text-white/80 relative text-ellipsis whitespace-nowrap ${cell.column.id === 'status' ? 'overflow-visible' : 'overflow-hidden'}`}
          style={{ width: cell.column.getSize(), maxWidth: cell.column.getSize() }}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
      {/* Add Column Button Placeholder */}
      <td style={{ width: "40px" }} className="p-2 border-l border-white/5 text-center">
        <div className="w-6 h-6 rounded-md hover:bg-violet-900/30 flex items-center justify-center cursor-pointer transition-colors mx-auto group-hover:scale-110">
          <span className="text-violet-400/50 hover:text-violet-400 font-bold text-xs">+</span>
        </div>
      </td>
    </tr>
  );
});
