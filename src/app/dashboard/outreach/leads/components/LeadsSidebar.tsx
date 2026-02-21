"use client";

import React from "react";
import { Zap, Clock, Check, AlertCircle, Folder, Plus, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { ColdLeadList } from "@/app/actions/cold-leads";

interface LeadsSidebarProps {
  lists: ColdLeadList[];
  activeListName: string;
  setActiveListName: (name: string) => void;
  handleCreateList: () => void;
  handleEditList: (list: ColdLeadList, e: React.MouseEvent) => void;
}

export function LeadsSidebar({
  lists,
  activeListName,
  setActiveListName,
  handleCreateList,
  handleEditList,
}: LeadsSidebarProps) {
  return (
    <aside className="w-64 bg-white border-r border-gray-100 flex flex-col pt-8 pb-4 px-4 shadow-sm z-10 shrink-0">
      <div className="flex items-center gap-3 px-2 mb-8">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
          <Zap className="w-5 h-5 text-white fill-white/20" />
        </div>
        <div>
          <h1 className="font-black text-gray-900 text-sm uppercase tracking-wide">
            Cold Outreach
          </h1>
          <p className="text-[10px] text-gray-400 font-bold">Kampane & Zoznamy</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1 pr-2 scrollbar-thin scrollbar-thumb-gray-200">
        <div className="px-2 py-2 mb-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 pl-2">
            SmartLead Integrácia
          </p>
          <button
            onClick={() => setActiveListName("SL_queued")}
            className={cn(
              "w-full text-left px-4 py-3 rounded-[1rem] flex items-center gap-3 transition-all text-xs font-bold",
              activeListName === "SL_queued"
                ? "bg-orange-50 text-orange-700 shadow-sm ring-1 ring-orange-100"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <Clock className="w-4 h-4" />
            Vo Fronte
          </button>
          <button
            onClick={() => setActiveListName("SL_pushed")}
            className={cn(
              "w-full text-left px-4 py-3 rounded-[1rem] flex items-center gap-3 transition-all text-xs font-bold",
              activeListName === "SL_pushed"
                ? "bg-green-50 text-green-700 shadow-sm ring-1 ring-green-100"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <Check className="w-4 h-4" />
            Aktívne / Pushed
          </button>
          <button
            onClick={() => setActiveListName("SL_failed")}
            className={cn(
              "w-full text-left px-4 py-3 rounded-[1rem] flex items-center gap-3 transition-all text-xs font-bold",
              activeListName === "SL_failed"
                ? "bg-red-50 text-red-700 shadow-sm ring-1 ring-red-100"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <AlertCircle className="w-4 h-4" />
            Chyby
          </button>
        </div>

        <div className="px-2 py-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 pl-2">
            Moje Zoznamy
          </p>
          {lists.map((list) => (
            <div key={list.id} className="group relative">
              <button
                onClick={() => setActiveListName(list.name)}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-[1rem] flex items-center gap-3 transition-all text-xs font-bold pr-10",
                  activeListName === list.name
                    ? "bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Folder
                  className={cn(
                    "w-4 h-4",
                    activeListName === list.name ? "fill-blue-200" : ""
                  )}
                />
                <span className="truncate">{list.name}</span>
              </button>
              <button
                onClick={(e) => handleEditList(list, e)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                title="Upraviť zoznam"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 px-2">
        <button
          onClick={handleCreateList}
          className="w-full py-3 border-2 border-dashed border-gray-200 rounded-[1rem] flex items-center justify-center gap-2 text-gray-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/50 transition-all font-bold text-xs uppercase tracking-wide"
        >
          <Plus className="w-4 h-4" />
          Nový Zoznam
        </button>
      </div>
    </aside>
  );
}
