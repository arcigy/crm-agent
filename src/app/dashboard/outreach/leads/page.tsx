"use client";

import React, { useState, useEffect } from "react";
import { Zap, Upload, Trash2, Search, Loader2, Link2, MapPin, Briefcase } from "lucide-react";
import { getColdLeads, deleteColdLead, type ColdLeadItem } from "@/app/actions/cold-leads";
import { ColdLeadsImportModal } from "@/components/dashboard/ColdLeadsImportModal";
import { toast } from "sonner";

export default function OutreachLeadsPage() {
  const [leads, setLeads] = useState<ColdLeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const refreshLeads = async () => {
    setLoading(true);
    const res = await getColdLeads();
    if (res.success && res.data) {
      setLeads(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    const initLeads = async () => {
      await refreshLeads();
    };
    initLeads();
  }, []);

  const handleDelete = async (id: string | number) => {
    if (!window.confirm("Naozaj chcete vymazať tento lead?")) return;
    const res = await deleteColdLead(id);
    if (res.success) {
      toast.success("Lead vymazaný");
      refreshLeads();
    }
  };

  const filteredLeads = leads.filter(l => 
    l.company_name_reworked?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight flex items-center gap-4 text-gray-900 italic">
            <Zap className="w-10 h-10 text-blue-600 fill-blue-600/20" />
            Cold Outreach
          </h1>
          <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[11px] mt-2">
            Databáza spracovaných leadov s AI personalizáciou
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="bg-gray-900 hover:bg-black text-white px-8 py-4 rounded-[1.5rem] font-black uppercase tracking-widest text-[11px] flex items-center gap-3 transition-all shadow-xl shadow-gray-200 active:scale-95"
          >
            <Upload className="w-4 h-4" />
            Importovať Leady
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-[3rem] overflow-hidden shadow-2xl shadow-gray-100">
        <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row gap-6 justify-between bg-gray-50/50">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Hľadať firmu, mesto alebo kategóriu..."
              className="w-full pl-14 pr-6 py-4 bg-white border-2 border-gray-100 rounded-[1.5rem] text-sm outline-none focus:border-blue-500 transition-all font-bold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <div className="bg-white px-6 py-4 border-2 border-gray-100 rounded-[1.5rem] flex items-center gap-3">
               <span className="text-[10px] font-black tracking-widest text-gray-400 uppercase">Spolu:</span>
               <span className="text-sm font-black text-blue-600">{leads.length}</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/30">
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Firma & Web</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Lokalita & Sektor</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">AI Personalizácia</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Akcie</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                    <td colSpan={4} className="py-32 text-center">
                        <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600/20" />
                    </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">
                    Žiadne leady v databáze. Nahrajte CSV.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="font-black text-gray-900 text-base mb-1">{lead.company_name_reworked || lead.title}</div>
                      {lead.website && (
                        <a href={lead.website} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700 text-[10px] font-bold flex items-center gap-1 uppercase tracking-widest">
                          <Link2 className="w-3 h-3" /> {lead.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                        </a>
                      )}
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-gray-600 font-bold text-xs mb-1">
                        <MapPin className="w-3 h-3 text-gray-300" /> {lead.city || "Neznáme"}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-blue-600 font-black uppercase tracking-widest bg-blue-50 px-2 py-1 rounded-md w-fit">
                        <Briefcase className="w-3 h-3" /> {lead.category || "Iné"}
                      </div>
                    </td>
                    <td className="px-8 py-6 max-w-md">
                      <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <p className="text-[11px] font-bold leading-relaxed text-gray-600 italic">
                          &quot;{lead.ai_first_sentence}&quot;
                        </p>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button 
                        onClick={() => handleDelete(lead.id)}
                        className="p-3 text-gray-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-90"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ColdLeadsImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        onSuccess={refreshLeads} 
      />
    </div>
  );
}
