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
          <span className="font-medium text-gray-700 group-hover:text-blue-700 hover:underline">
            {d.toLocaleDateString("sk-SK", { day: "numeric", month: "short" })}
          </span>
        </Link>
      );
    },
  }),
  columnHelper.accessor("name", {
    header: "Projekt / Typ",
    cell: (info) => (
      <div className="flex flex-col">
        <span className="font-black text-gray-900 text-[11px] uppercase tracking-tight italic">
          {info.getValue() || info.row.original.project_type}
        </span>
        <div className="flex items-center gap-1 opacity-50">
          <FolderKanban className="w-2.5 h-2.5" />
          <span className="text-[9px] font-bold uppercase tracking-widest">
            {info.row.original.project_type}
          </span>
        </div>
      </div>
    ),
  }),
  columnHelper.accessor("contact_name", {
    header: "Kontakt",
    cell: (info) => {
      const name = info.getValue();
      if (!name) return <span className="text-gray-300 text-sm italic">—</span>;
      const initials = name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase();
      return (
        <div
          className="flex items-center gap-2 cursor-pointer group"
          onClick={() => {
            const c = contacts.find(
              (c) => String(c.id) === String(info.row.original.contact_id),
            );
            if (c) onContactClick(c);
          }}
        >
          <div className="w-6 h-6 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-700">
            {initials}
          </div>
          <span className="text-xs font-bold text-gray-700 group-hover:text-blue-600 transition-colors">
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
      if (!val) return <span className="text-gray-300 text-sm italic">—</span>;
      const d = new Date(val);
      const isOverdue =
        d < new Date() && info.row.original.stage !== "completed";
      return (
        <div
          className={`flex items-center gap-2 text-sm ${isOverdue ? "text-red-600" : "text-gray-700"}`}
        >
          <Calendar
            className={`w-4 h-4 ${isOverdue ? "text-red-400" : "text-gray-400"}`}
          />
          <span className="font-medium">{d.toLocaleDateString("sk-SK")}</span>
          {isOverdue && (
            <span className="text-[10px] font-black text-red-500 uppercase">
              Meškanie!
            </span>
          )}
        </div>
      );
    },
  }),
  columnHelper.display({
    id: "drive",
    header: "Súbory",
    cell: (info) => (
      <button
        onClick={() => onDriveClick(info.row.original)}
        className={`p-1.5 rounded-lg border border-gray-100 ${info.row.original.drive_folder_id ? "bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white" : "bg-gray-50 text-gray-400 hover:bg-gray-200"}`}
      >
        <HardDrive className="w-3.5 h-3.5" />
      </button>
    ),
  }),
];
