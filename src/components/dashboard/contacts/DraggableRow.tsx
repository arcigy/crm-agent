"use client";

import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { flexRender, Row } from "@tanstack/react-table";
import { Lead } from "@/types/contact";

interface DraggableRowProps {
  row: Row<Lead>;
}

export function DraggableRow({ row }: DraggableRowProps) {
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
      className={`group bg-card hover:bg-indigo-500/5 transition-all duration-150 relative ${isDragging ? "shadow-2xl ring-2 ring-indigo-500/30 bg-card scale-[1.01]" : ""}`}
    >
      {/* Unified Control Gutter */}
      <td style={{ width: "72px" }} className="p-0 border-r border-border z-10 bg-inherit group/gutter">
        <div className="flex items-center justify-between px-2 h-full">
          {/* Selection */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              row.toggleSelected();
            }}
            className={`w-4 h-4 rounded-full border-2 transition-all flex items-center justify-center ${
              row.getIsSelected()
                ? "bg-blue-600 border-blue-600"
                : "border-muted-foreground/30 hover:border-blue-500"
            }`}
          >
            {row.getIsSelected() && (
              <div className="w-1.5 h-1.5 bg-white rounded-full" />
            )}
          </button>

          {/* Color Strip */}
          <div className="relative h-8 w-1.5">
            <div
              className={`absolute inset-y-0 left-0 w-1.5 rounded-full 
                        ${String(row.original.status).toLowerCase() === "published" || String(row.original.status).toLowerCase() === "active" ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-muted"}
                    `}
            ></div>
          </div>

          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="opacity-0 group-hover/gutter:opacity-100 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-blue-500 transition-all p-1 hover:bg-blue-600/10 rounded"
          >
            ⠿
          </div>
        </div>
      </td>
      {row.getVisibleCells().map((cell) => (
        <td
          key={cell.id}
          style={{ width: cell.column.getSize() }}
          className="px-3 py-1 border-r border-border last:border-0 text-xs text-foreground/90 relative group/cell hover:bg-card/80 transition-colors"
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
      {/* Add Column Button Placeholder */}
      <td style={{ width: "40px" }} className="p-2 border-l border-border text-center">
        <div className="w-6 h-6 rounded-full hover:bg-muted flex items-center justify-center cursor-pointer transition-colors mx-auto group-hover:scale-110">
          <span className="text-muted-foreground text-xs">+</span>
        </div>
      </td>
    </tr>
  );
}
