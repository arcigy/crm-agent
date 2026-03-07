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
      const val = info.getValue();
      const d = new Date(val);
      const isValid = val && !isNaN(d.getTime());
      const iso = isValid ? d.toISOString().split("T")[0] : "";
      return (
        <Link
          href={iso ? `/dashboard/calendar?date=${iso}` : "#"}
          className="flex items-center gap-1.5 text-xs group hover:text-violet-400 transition-colors"
          onClick={(e) => !iso && e.preventDefault()}
        >
          <Calendar className="w-3.5 h-3.5 text-violet-400/20 group-hover:text-violet-400" />
          <span className="font-bold text-zinc-400 group-hover:text-violet-300 transition-colors tracking-tight uppercase">
            {isValid
              ? d.toLocaleDateString("sk-SK", {
                  day: "numeric",
                  month: "short",
                })
              : "—"}
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
        <span className="font-black text-zinc-100 text-[11px] uppercase tracking-tight italic group-hover/name:text-violet-400 transition-colors">
          {info.getValue() || info.row.original.project_type}
        </span>
        <div className="flex items-center gap-1 opacity-40">
          <FolderKanban className="w-2.5 h-2.5 text-violet-400/50" />
          <span className="text-[9px] font-black uppercase tracking-widest text-violet-400/50">
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
          <div className="w-7 h-7 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-[10px] font-black text-violet-400 group-hover:bg-violet-500 group-hover:text-white transition-all shadow-lg shadow-violet-500/5 group-hover:shadow-violet-500/20">
            {initials}
          </div>
          <span className="text-[11px] font-black uppercase tracking-tight text-zinc-400 group-hover:text-violet-300 transition-colors">
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
          className={`flex items-center gap-2 text-[11px] group ${isOverdue ? "text-rose-500" : "text-zinc-400"}`}
          onClick={(e) => !iso && e.preventDefault()}
        >
          <Calendar
            className={`w-3.5 h-3.5 ${isOverdue ? "text-rose-400" : "text-violet-400/20"} group-hover:text-violet-400 transition-colors`}
          />
          <span className="font-black uppercase tracking-tight group-hover:text-violet-300 transition-colors">
            {isValidDate ? d.toLocaleDateString("sk-SK") : "—"}
          </span>
          {isOverdue && (
            <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest animate-pulse">
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
        disabled={!info.row.original.drive_folder_id}
        onClick={(e) => {
          e.stopPropagation();
          if (info.row.original.drive_folder_id) {
            onDriveClick(info.row.original);
          }
        }}
        className={`p-2 rounded-xl border border-violet-500/10 transition-all ${
          info.row.original.drive_folder_id
            ? "bg-violet-500/10 text-violet-400 hover:bg-violet-600 hover:text-white shadow-lg shadow-violet-600/10 cursor-pointer"
            : "bg-zinc-900/50 text-zinc-700 border-transparent cursor-not-allowed opacity-30"
        }`}
        title={info.row.original.drive_folder_id ? "Otvoriť súbory" : "Súborový priečinok nie je prepojený"}
      >
        <HardDrive className="w-3.5 h-3.5" />
      </button>
    ),
  }),
];
