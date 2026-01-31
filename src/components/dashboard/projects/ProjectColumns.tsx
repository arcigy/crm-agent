"use client";

import * as React from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { Calendar, FolderKanban, HardDrive } from "lucide-react";
import Link from "next/link";
import { Project } from "@/types/project";
import { Lead } from "@/types/contact";
import { StageBadge } from "./StageBadge";

const columnHelper = createColumnHelper<Project>();

export const getProjectColumns = (
  contacts: Lead[],
  onStageChange: (id: number, stage: any) => Promise<void>,
  onContactClick: (contact: Lead) => void,
  onDriveClick: (project: Project) => void,
  onProjectClick?: (project: Project) => void,
) => [
  columnHelper.accessor("date_created", {
    header: "Dátum vytvorenia",
    cell: (info) => {
      const d = new Date(info.getValue());
      const iso = d.toISOString().split("T")[0];
      return (
        <Link
          href={`/dashboard/calendar?date=${iso}`}
          className="flex items-center gap-1.5 text-xs group hover:text-blue-600 transition-colors"
        >
          <Calendar className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-400" />
          <span className="font-medium text-foreground group-hover:text-blue-700 dark:group-hover:text-blue-400 hover:underline">
            {d.toLocaleDateString("sk-SK", { day: "numeric", month: "short" })}
          </span>
        </Link>
      );
    },
  }),
  columnHelper.accessor("name", {
    header: "Projekt / Typ",
    cell: (info) => (
      <div
        className="flex flex-col cursor-pointer group/name"
        onClick={() => onProjectClick?.(info.row.original)}
      >
        <span className="font-black text-foreground text-[11px] uppercase tracking-tight italic group-hover/name:text-blue-600 transition-colors">
          {info.getValue() || info.row.original.project_type}
        </span>
        <div className="flex items-center gap-1 opacity-50">
          <FolderKanban className="w-2.5 h-2.5 text-gray-400" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">
            {info.row.original.project_type}
          </span>
        </div>
      </div>
    ),
  }),
  columnHelper.accessor("contact_name", {
    // ... (rest is same, but I'll update the cell to be sure)
    header: "Kontakt",
    cell: (info) => {
      const name = info.getValue();
      if (!name)
        return (
          <span className="text-gray-300 dark:text-gray-600 text-sm italic">
            —
          </span>
        );
      const initials = name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase();
      return (
        <div
          className="flex items-center gap-2 cursor-pointer group"
          onClick={() => {
            if (!contacts) return;
            const c = contacts.find(
              (c) => String(c.id) === String(info.row.original.contact_id),
            );
            if (c) onContactClick(c);
          }}
        >
          <div className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 flex items-center justify-center text-[10px] font-bold text-blue-700 dark:text-blue-300">
            {initials}
          </div>
          <span className="text-xs font-bold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {name}
          </span>
        </div>
      );
    },
  }),
  columnHelper.accessor("stage", {
    header: "Štádium",
    cell: (info) => (
      <StageBadge
        stage={info.getValue()}
        projectId={info.row.original.id}
        onStageChange={onStageChange}
      />
    ),
  }),
  columnHelper.accessor("end_date", {
    header: "Dátum ukončenia",
    cell: (info) => {
      const val = info.getValue();
      if (!val)
        return (
          <span className="text-gray-300 dark:text-gray-600 text-sm italic">
            —
          </span>
        );
      const d = new Date(val);
      const isValidDate = !isNaN(d.getTime());
      const iso = isValidDate ? d.toISOString().split("T")[0] : "";
      const isOverdue =
        isValidDate &&
        d < new Date() &&
        info.row.original.stage !== "completed";
      return (
        <Link
          href={iso ? `/dashboard/calendar?date=${iso}` : "#"}
          className={`flex items-center gap-2 text-sm group hover:underline ${isOverdue ? "text-red-500" : "text-foreground"}`}
          onClick={(e) => !iso && e.preventDefault()}
        >
          <Calendar
            className={`w-4 h-4 ${isOverdue ? "text-red-400" : "text-gray-400"} group-hover:text-blue-400`}
          />
          <span className="font-medium group-hover:text-blue-600">
            {d.toLocaleDateString("sk-SK")}
          </span>
          {isOverdue && (
            <span className="text-[10px] font-black text-red-500 uppercase">
              Meškanie!
            </span>
          )}
        </Link>
      );
    },
  }),
  columnHelper.display({
    id: "drive",
    header: "Súbory",
    cell: (info) => (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDriveClick(info.row.original);
        }}
        className={`p-1.5 rounded-lg border border-border transition-colors ${info.row.original.drive_folder_id ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white" : "bg-gray-50 dark:bg-slate-800 text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700"}`}
      >
        <HardDrive className="w-3.5 h-3.5" />
      </button>
    ),
  }),
];
