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
    width: header.getSize(),
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 100 : 1,
    position: "relative",
  };

  return (
    <th
      ref={setNodeRef}
      style={style}
      className={`group relative px-3 py-1.5 text-[9px] font-bold text-muted-foreground uppercase tracking-wider border-r border-border last:border-0 hover:bg-muted/50 transition-colors select-none ${isDragging ? "bg-muted shadow-lg" : ""}`}
    >
      <div className="flex items-center gap-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripHorizontal className="w-3 h-3 text-muted-foreground/50" />
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
          className={`resizer absolute -right-2 top-0 h-full w-4 cursor-col-resize select-none touch-none bg-transparent hover:bg-indigo-500/30 active:bg-indigo-500/50 transition-colors z-30 ${
            header.column.getIsResizing() ? "bg-indigo-500/50" : ""
          }`}
        />
      )}
    </th>
  );
}
