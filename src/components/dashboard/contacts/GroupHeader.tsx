"use client";

import * as React from "react";
import { useDroppable } from "@dnd-kit/core";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Row } from "@tanstack/react-table";
import { Lead } from "@/types/contact";

interface GroupHeaderProps {
  row: Row<Lead>;
  columnsCount: number;
}

export function GroupHeader({ row, columnsCount }: GroupHeaderProps) {
  const status = String(row.original?.status || "").toLowerCase();
  const { setNodeRef, isOver } = useDroppable({
    id: `group-${status}`,
    data: {
      type: "group",
      status: status === "published" ? "published" : "draft",
    },
  });

  return (
    <tr
      ref={setNodeRef}
      key={row.id}
      className={`bg-card/50 hover:bg-muted/30 transition-colors ${isOver ? "bg-blue-600/10 ring-2 ring-blue-500 ring-inset" : ""}`}
    >
      <td colSpan={columnsCount + 3} className="p-4">
        <div
          className="flex items-center gap-2 cursor-pointer select-none group"
          onClick={row.getToggleExpandedHandler()}
        >
          <div className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted transition-colors">
            {row.getIsExpanded() ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform" />
            )}
          </div>

          <div
            className={`
                        flex items-center gap-2 px-3 py-1 rounded-md text-sm font-black tracking-tight transition-all
                        ${status === "published" ? "text-green-500 bg-green-500/10" : "text-foreground/80 bg-muted"}
                        ${isOver ? "scale-110 shadow-lg" : ""}
                    `}
          >
            {status === "published"
              ? "Active Participants"
              : "Inactive Pipeline"}
            <span className="font-bold text-muted-foreground/60 ml-1 text-xs px-1.5 py-0.5 bg-card rounded border border-border">
              {row.subRows.length}
            </span>
            {isOver && (
              <span className="ml-2 animate-pulse text-[10px] uppercase">
                Drop to change status
              </span>
            )}
          </div>
          <div className="h-px bg-border flex-1 ml-4 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </div>
      </td>
    </tr>
  );
}
