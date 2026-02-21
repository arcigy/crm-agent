"use client";

import React from "react";
import { ArrowLeft, Upload, Trash2 } from "lucide-react";
import Link from "next/link";
import { ColdLeadList } from "@/app/actions/cold-leads";

interface LeadsHeaderProps {
  activeListName: string;
  lists: ColdLeadList[];
  filteredCount: number;
  onCleanup: () => void;
  onImport: () => void;
}

export function LeadsHeader({
  activeListName,
  lists,
  filteredCount,
  onCleanup,
  onImport,
}: LeadsHeaderProps) {
  const currentList = lists.find((l) => l.name === activeListName);

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/dashboard/outreach"
          className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-blue-600 transition-colors mb-2 w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Späť na Outreach
        </Link>
        <div className="flex flex-col gap-0.5">
          <h2 className="text-3xl font-black tracking-tight text-gray-900 flex items-center gap-3">
            {activeListName}
            <span className="text-sm font-bold bg-gray-100 text-gray-500 px-3 py-1 rounded-full">
              {filteredCount}
            </span>
          </h2>
          {currentList?.description && (
            <p className="text-xs text-gray-500 font-medium max-w-2xl mt-1 italic">
              {currentList.description}
            </p>
          )}
        </div>
      </div>
      <div className="flex gap-3">
        <button
          onClick={onCleanup}
          className="bg-white border text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 px-4 py-3 rounded-[1.2rem] font-bold uppercase tracking-wide text-[11px] flex items-center gap-2 transition-all"
          title="Vymazať duplikáty v tomto zozname"
        >
          <Trash2 className="w-4 h-4" />
          <span className="max-md:hidden">Vyčistiť Duplikáty</span>
        </button>
        <button
          onClick={onImport}
          className="bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-[1.2rem] font-bold uppercase tracking-wide text-[11px] flex items-center gap-2 transition-all shadow-lg shadow-gray-200 active:scale-95"
        >
          <Upload className="w-4 h-4" />
          Import Leady
        </button>
      </div>
    </div>
  );
}
