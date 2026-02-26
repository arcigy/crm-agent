"use client";

import * as React from "react";
import { Header, flexRender } from "@tanstack/react-table";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripHorizontal } from "lucide-react";

interface DraggableHeaderProps {
  header: Header<any, unknown>;
}

export function DraggableHeader({ header }: DraggableHeaderProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useSortable({
    id: header.column.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition: isDragging ? undefined : 'none', // No animation when dropping
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 100 : 1,
    position: "relative",
  };

  return (
    <th
      ref={setNodeRef}
      style={{ ...style, width: header.getSize() }}
      className={`group relative px-3 py-2 text-[10px] font-bold text-white/50 uppercase tracking-wider border-r border-white/5 last:border-0 transition-colors select-none overflow-hidden whitespace-nowrap ${
        isDragging 
          ? "bg-zinc-900 shadow-xl ring-1 ring-violet-500/30" 
          : "hover:bg-white/5"
      }`}
    >
      <div className="flex items-center gap-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripHorizontal className="w-3 h-3 text-white/30 hover:text-white/60" />
        </div>
        <div className="flex-1 truncate">
          {header.isPlaceholder
            ? null
            : flexRender(header.column.columnDef.header, header.getContext())}
        </div>
      </div>

      {header.column.getCanResize() && (
        <div
          onMouseDown={header.getResizeHandler()}
          onTouchStart={header.getResizeHandler()}
          onDoubleClick={() => {
            const column = header.column;
            const rows = header.getContext().table.getRowModel().rows;
            let maxChars = String(column.columnDef.header || "").length;
            
            rows.forEach((row) => {
              const value = row.getValue(column.id);
              const length = String(value || "").length;
              if (length > maxChars) maxChars = length;
            });

            const newSize = Math.min(600, Math.max(60, maxChars * 8 + 32));
            header.getContext().table.setColumnSizing((prev) => ({
              ...prev,
              [column.id]: newSize,
            }));
          }}
          className={`resizer absolute -right-2 top-0 h-full w-4 cursor-col-resize select-none touch-none z-[100] flex items-center justify-center group/resizer ${
            header.column.getIsResizing() ? "bg-violet-900/10" : ""
          }`}
        >
          {/* Thin line for resizing instead of thick purple rectangle */}
          <div 
            className={`w-[2px] h-full transition-colors duration-200 rounded-full ${
              header.column.getIsResizing() 
                ? "bg-violet-400 shadow-[0_0_12px_rgba(167,139,250,0.8)] opacity-100" 
                : "bg-transparent group-hover/resizer:bg-white/30"
            }`}
          />
        </div>
      )}
    </th>
  );
}
