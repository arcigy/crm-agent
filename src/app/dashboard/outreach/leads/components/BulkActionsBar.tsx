"use client";

import React from "react";
import { 
    ArrowRightLeft, Trash2, Send, RefreshCw, BarChart3, Cloud, Settings, Download
} from "lucide-react";
import { ColdLeadList } from "@/app/actions/cold-leads";
import { cn } from "@/lib/utils";

interface BulkActionsBarProps {
    selectedCount: number;
    activeListName: string;
    lists: ColdLeadList[];
    onBulkMove: (target: string) => void;
    onBulkDelete: () => void;
    onBulkSendEmail: () => void;
    onBulkReEnrich: () => void;
    onBulkSort: () => void;
    onIndustryClassifier: () => void;
    onSmartLead: () => void;
    onExport: () => void;
}

export function BulkActionsBar({
    selectedCount,
    activeListName,
    lists,
    onBulkMove,
    onBulkDelete,
    onBulkSendEmail,
    onBulkReEnrich,
    onBulkSort,
    onIndustryClassifier,
    onSmartLead,
    onExport
}: BulkActionsBarProps) {
    if (selectedCount === 0) return null;

    return (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white border border-gray-800 shadow-2xl rounded-[2rem] p-2 flex items-center gap-2 animate-in slide-in-from-bottom-8 duration-300">
             <div className="flex items-center gap-4 px-6 border-r border-gray-800">
                 <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-black text-xs shrink-0">
                     {selectedCount}
                 </div>
                 <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Vybrané</span>
             </div>
             
             <div className="flex gap-1 px-2">
                 <button onClick={onBulkSendEmail} className="p-3 hover:bg-white/10 rounded-2xl flex flex-col items-center gap-1 transition-all" title="Poslať Email">
                    <Send className="w-4 h-4 text-emerald-400" />
                    <span className="text-[8px] font-black uppercase">Email</span>
                 </button>
                 
                 <button onClick={onBulkReEnrich} className="p-3 hover:bg-white/10 rounded-2xl flex flex-col items-center gap-1 transition-all" title="Spustiť AI Enrichment">
                    <RefreshCw className="w-4 h-4 text-blue-400" />
                    <span className="text-[8px] font-black uppercase">Enrich</span>
                 </button>

                 <button onClick={onIndustryClassifier} className="p-3 hover:bg-white/10 rounded-2xl flex flex-col items-center gap-1 transition-all" title="Industry Classifier">
                    <BarChart3 className="w-4 h-4 text-purple-400" />
                    <span className="text-[8px] font-black uppercase">Typ</span>
                 </button>

                 <button onClick={onSmartLead} className="p-3 hover:bg-indigo-600 rounded-2xl flex flex-col items-center gap-1 transition-all bg-indigo-500/20" title="SmartLead">
                    <Cloud className="w-4 h-4 text-indigo-400" />
                    <span className="text-[8px] font-black uppercase">SmartLead</span>
                 </button>

                 <button onClick={onExport} className="p-3 hover:bg-white/10 rounded-2xl flex flex-col items-center gap-1 transition-all" title="Export CSV">
                    <Download className="w-4 h-4 text-gray-400" />
                     <span className="text-[8px] font-black uppercase">CSV</span>
                 </button>

                 <div className="w-px h-8 bg-gray-800 mx-2 self-center"></div>

                 <div className="relative group self-center">
                    <button className="px-4 py-3 hover:bg-white/10 rounded-2xl flex items-center gap-2 text-white font-black text-[10px] transition-all uppercase tracking-widest">
                        <ArrowRightLeft className="w-4 h-4 text-amber-400" />
                        Presun
                    </button>
                    <div className="absolute bottom-full left-0 mb-4 w-48 bg-gray-800 border border-gray-700 shadow-2xl rounded-2xl overflow-hidden hidden group-hover:block">
                        {lists.filter(l => l.name !== activeListName).map(l => (
                            <button 
                                key={l.id} 
                                onClick={() => onBulkMove(l.name)}
                                className="w-full text-left px-4 py-3 hover:bg-gray-700 text-[10px] font-black text-gray-300 hover:text-white transition-colors uppercase tracking-widest"
                            >
                                {l.name}
                            </button>
                        ))}
                    </div>
                 </div>

                 <button onClick={onBulkDelete} className="p-3 hover:bg-red-500/20 rounded-2xl flex flex-col items-center gap-1 transition-all group/del" title="Zmazať">
                    <Trash2 className="w-4 h-4 text-red-400 group-hover/del:text-red-500" />
                    <span className="text-[8px] font-black uppercase">Zmazať</span>
                 </button>
             </div>
        </div>
    );
}
