"use client";

import React, { useState, useEffect } from "react";
import { Zap, Upload, Trash2, Search, Filter, Download, Plus, Loader2 } from "lucide-react";
import { bulkCreateOutreachLeads, getOutreachLeads, deleteAllLeads } from "@/app/actions/outreach";
import Papa from "papaparse";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";

export default function OutreachLeadsPage() {
  const { user } = useUser();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const refreshLeads = async () => {
    setLoading(true);
    const res = await getOutreachLeads();
    if (res.success) {
      setLeads(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    refreshLeads();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const parsed = results.data.map((row: any) => ({
          email: row.email || row.Email || "",
          phone: row.phone || row.Phone || "",
          company: row.company || row.Company || "",
          location: row.poloha || row.location || row.Location || "",
          industry: row.industry || row.Industry || "",
          ai_first_sentence: row.ai_generated_first_sentence || row["ai first sentence"] || "",
          status: "pending"
        }));

        const res = await bulkCreateOutreachLeads(parsed);
        if (res.success) {
          toast.success(`Úspešne nahraných ${parsed.length} leadov`);
          refreshLeads();
        } else {
          toast.error("Chyba pri nahrávaní: " + res.error);
        }
        setUploading(false);
      },
      error: (err) => {
        toast.error("Chyba pri parsovaní CSV: " + err.message);
        setUploading(false);
      }
    });
  };

  const handleDeleteAll = async () => {
    if (!window.confirm("Naozaj chcete vymazať VŠETKY leady z vášho zoznamu? Táto akcia je nevratná.")) return;
    
    setLoading(true);
    const res = await deleteAllLeads();
    if (res.success) {
      toast.success("Všetky leady boli odstránené");
      setLeads([]);
    } else {
      toast.error("Chyba pri mazaní: " + res.error);
    }
    setLoading(false);
  };

  const filteredLeads = leads.filter(l => 
    l.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <Zap className="w-8 h-8 text-blue-600" />
            Outreach Leads
          </h1>
          <p className="text-muted-foreground font-medium">Správa separovaných leadov pre cold outreach kampane.</p>
        </div>
        <div className="flex gap-3">
          {leads.length > 0 && (
            <button 
              onClick={handleDeleteAll}
              disabled={loading}
              className="bg-red-500/10 hover:bg-red-500 text-red-600 hover:text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all active:scale-95 border border-red-500/20"
            >
              <Trash2 className="w-5 h-5" />
              Vymazať všetko
            </button>
          )}
          <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20 active:scale-95">
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
            Import CSV
            <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} disabled={uploading} />
          </label>
        </div>
      </div>

      <div className="bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border flex flex-col md:flex-row gap-4 justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Hľadať podľa emailu alebo firmy..."
              className="w-full pl-11 pr-4 py-3 bg-background border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600/20 transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button className="p-3 bg-background border border-border rounded-xl hover:bg-slate-50 transition-all">
                <Filter className="w-4 h-4 text-muted-foreground" />
            </button>
            <button className="p-3 bg-background border border-border rounded-xl hover:bg-slate-50 transition-all">
                <Download className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-slate-50/30 dark:bg-slate-900/30">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Email / Lead</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Company & Industry</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Location</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">AI Intro</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right italic">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                    <td colSpan={6} className="py-20 text-center">
                        <Loader2 className="w-10 h-10 animate-spin mx-auto text-blue-600 opacity-20" />
                    </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground font-medium">
                    Žiadne leady nenájdené. Nahrajte CSV súbor.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-sm">{lead.email}</div>
                      <div className="text-[10px] text-muted-foreground font-medium">{lead.phone || 'Bez tel.'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-sm">{lead.company}</div>
                      <div className="text-[10px] text-blue-600 font-black uppercase tracking-wider">{lead.industry}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-medium text-slate-500 italic">{lead.location}</div>
                    </td>
                    <td className="px-6 py-4 max-w-xs transition-all">
                      <p className="text-[11px] font-medium leading-relaxed line-clamp-2 text-slate-600">
                        {lead.ai_first_sentence}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          lead.status === 'replied' ? 'bg-purple-100 text-purple-700' :
                          lead.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {lead.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
