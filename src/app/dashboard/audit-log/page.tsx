"use client";

import React, { useState, useEffect } from "react";
import { 
  Search, 
  RefreshCcw, 
  Download, 
  Eye,
  User,
  ShieldCheck,
  Calendar,
  Layers,
  Activity,
  Cpu,
  TrendingUp,
  Brain,
  CheckCircle2,
  XCircle,
  Clock
} from "lucide-react";
import directus from "@/lib/directus";
import { readItems } from "@directus/sdk";
import { format } from "date-fns";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

/**
 * Audit Log Page - Prehľad zmien v systéme.
 * Využíva natívne štýly CRM systému (violet branding).
 */
export default function AuditLogPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCollection, setFilterCollection] = useState("");
  const [activeTab, setActiveTab] = useState<"system" | "ai">("system");
  const [aiLogs, setAiLogs] = useState<any[]>([]);
  const [aiStats, setAiStats] = useState<any>({
    totalCost: 0,
    totalTokens: 0,
    successRate: 0,
    totalMissions: 0
  });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const result = await directus.request(
        readItems("audit_logs", {
          sort: ["-timestamp"],
          limit: 100,
        })
      );
      setLogs(result as any[]);
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
      toast.error("Nepodarilo sa načítať auditné logy.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAiLogs = async () => {
    setLoading(true);
    try {
      const result = await directus.request(
        readItems("ai_audit_logs" as any, {
          sort: ["-timestamp"],
          limit: 100,
        })
      );
      setAiLogs(result as any[]);
      
      // Basic stats calculation (client-side for simplicity)
      if (result.length > 0) {
        const cost = result.reduce((sum, r) => sum + Number(r.estimated_cost_usd || 0), 0);
        const tokens = result.reduce((sum, r) => sum + (r.input_tokens || 0) + (r.output_tokens || 0), 0);
        const success = result.filter(r => r.success).length;
        setAiStats({
          totalCost: cost,
          totalTokens: tokens,
          successRate: (success / result.length) * 100,
          totalMissions: result.length
        });
      }
    } catch (err) {
      console.error("Failed to fetch AI logs:", err);
      toast.error("Nepodarilo sa načítať AI auditné logy.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "system") {
      fetchLogs();
    } else {
      fetchAiLogs();
    }
  }, [activeTab]);

  const handleRefresh = () => {
    const action = activeTab === "system" ? fetchLogs() : fetchAiLogs();
    toast.promise(action, {
      loading: "Aktualizujem logy...",
      success: "Logy boli aktualizované",
      error: "Chyba pri aktualizácii"
    });
  };

  const filteredLogs = logs.filter(log => 
    (log.collection?.toLowerCase().includes(search.toLowerCase()) || 
     log.user_email?.toLowerCase().includes(search.toLowerCase()) ||
     log.action?.toLowerCase().includes(search.toLowerCase())) &&
    (filterCollection === "" || log.collection === filterCollection)
  );

  const filteredAiLogs = aiLogs.filter(log => 
    log.mission_summary?.toLowerCase().includes(search.toLowerCase()) || 
    log.user_email?.toLowerCase().includes(search.toLowerCase()) ||
    log.model?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-end px-2">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase italic leading-none flex items-center gap-3">
            <ShieldCheck className="w-10 h-10 text-violet-500" />
            Auditný Log
          </h1>
          <p className="text-slate-500 font-medium tracking-tight ml-1">
            História zmien a bezpečnostných udalostí v systéme.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="bg-zinc-950 p-1 rounded-xl border border-white/5 flex gap-1 mr-4">
             <button 
               onClick={() => setActiveTab("system")}
               className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase italic transition-all ${activeTab === 'system' ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/40' : 'text-slate-500 hover:text-white'}`}
             >
               Systém
             </button>
             <button 
               onClick={() => setActiveTab("ai")}
               className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase italic transition-all ${activeTab === 'ai' ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/40' : 'text-slate-500 hover:text-white'}`}
             >
               AI Misie
             </button>
          </div>
          <button 
            onClick={handleRefresh}
            className="bg-zinc-900 hover:bg-zinc-800 text-white border border-white/5 px-4 py-2 rounded-xl transition-all flex items-center gap-2"
          >
            <RefreshCcw className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-bold uppercase italic">Obnoviť</span>
          </button>
          <button className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-violet-900/20">
            <Download className="w-4 h-4" />
            <span className="text-sm font-bold uppercase italic">Export</span>
          </button>
        </div>
      </div>

      {/* AI Stats Cards */}
      {activeTab === "ai" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 px-2">
           <div className="bg-zinc-900/50 border border-violet-900/20 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
                 <Cpu className="w-6 h-6 text-violet-500" />
              </div>
              <div>
                 <p className="text-[10px] font-black uppercase text-slate-500 italic tracking-widest">Model Usage</p>
                 <p className="text-xl font-black text-white">{aiStats.totalMissions} missions</p>
              </div>
           </div>
           <div className="bg-zinc-900/50 border border-violet-900/20 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                 <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                 <p className="text-[10px] font-black uppercase text-slate-500 italic tracking-widest">Success Rate</p>
                 <p className="text-xl font-black text-white">{aiStats.successRate.toFixed(1)}%</p>
              </div>
           </div>
           <div className="bg-zinc-900/50 border border-violet-900/20 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                 <Layers className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                 <p className="text-[10px] font-black uppercase text-slate-500 italic tracking-widest">Total Tokens</p>
                 <p className="text-xl font-black text-white">{(aiStats.totalTokens / 1000).toFixed(1)}k</p>
              </div>
           </div>
           <div className="bg-zinc-900/50 border border-violet-900/20 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
                 <TrendingUp className="w-6 h-6 text-violet-500" />
              </div>
              <div>
                 <p className="text-[10px] font-black uppercase text-slate-500 italic tracking-widest">Total Cost</p>
                 <p className="text-xl font-black text-white">${aiStats.totalCost.toFixed(3)}</p>
              </div>
           </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 px-2">
        <div className="relative md:col-span-2">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            placeholder={activeTab === 'system' ? "Hľadať podľa kolekcie, akcie alebo e-mailu..." : "Hľadať v misiách, modeloch alebo emailoch..."}
            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 outline-none transition-all placeholder:text-slate-600"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {activeTab === "system" && (
          <div className="flex gap-2 md:col-span-2">
            <div className="relative flex-1">
              <Layers className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              <select 
                className="w-full bg-zinc-900/50 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white appearance-none outline-none focus:border-violet-500/50 transition-all cursor-pointer"
                value={filterCollection}
                onChange={(e) => setFilterCollection(e.target.value)}
              >
                <option value="">Všetky kolekcie</option>
                <option value="contacts">Kontakty</option>
                <option value="deals">Obchody</option>
                <option value="projects">Projekty</option>
                <option value="crm_tasks">Úlohy</option>
                <option value="google_tokens">Google Tokeny</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Table Content */}
      <div className="flex-1 bg-zinc-950/80 backdrop-blur-md rounded-2xl border border-violet-900/30 overflow-hidden shadow-xl shadow-violet-900/10 flex flex-col">
        <div className="overflow-auto flex-1 thin-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-zinc-900/80 sticky top-0 z-10 border-b border-white/5">
              {activeTab === "system" ? (
                <tr>
                  <th className="p-4 text-xs font-black uppercase text-slate-500 italic tracking-widest">Kedy</th>
                  <th className="p-4 text-xs font-black uppercase text-slate-500 italic tracking-widest">Používateľ</th>
                  <th className="p-4 text-xs font-black uppercase text-slate-500 italic tracking-widest text-center">Akcia</th>
                  <th className="p-4 text-xs font-black uppercase text-slate-500 italic tracking-widest">Kolekcia</th>
                  <th className="p-4 text-xs font-black uppercase text-slate-500 italic tracking-widest">Zmenené polia</th>
                  <th className="p-4 text-xs font-black uppercase text-slate-500 italic tracking-widest text-right">Detail</th>
                </tr>
              ) : (
                <tr>
                  <th className="p-4 text-xs font-black uppercase text-slate-500 italic tracking-widest">Kedy</th>
                  <th className="p-4 text-xs font-black uppercase text-slate-500 italic tracking-widest">Agent / Model</th>
                  <th className="p-4 text-xs font-black uppercase text-slate-500 italic tracking-widest">Zadanie / Misia</th>
                  <th className="p-4 text-xs font-black uppercase text-slate-500 italic tracking-widest text-center">Stav</th>
                  <th className="p-4 text-xs font-black uppercase text-slate-500 italic tracking-widest">Náklady / Tokeny</th>
                  <th className="p-4 text-xs font-black uppercase text-slate-500 italic tracking-widest text-right">Misia ID</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-20 text-center font-bold text-slate-500 uppercase tracking-widest animate-pulse">
                    Načítavam záznamy...
                  </td>
                </tr>
              ) : (activeTab === 'system' ? filteredLogs : filteredAiLogs).length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-20 text-center text-slate-600 font-medium italic">
                    Nenašli sa žiadne {activeTab === 'ai' ? 'AI misie' : 'auditné záznamy'} vyhovujúce filtrom.
                  </td>
                </tr>
              ) : activeTab === 'system' ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-violet-900/10 transition-colors group">
                    <td className="p-4 text-sm font-mono text-slate-400">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-violet-500/50" />
                        {format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss")}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-violet-900/20 border border-violet-500/20 flex items-center justify-center">
                          <User className="w-3.5 h-3.5 text-violet-400" />
                        </div>
                        <span className="text-sm font-medium text-white tracking-tight">{log.user_email || "System"}</span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase italic tracking-wider ${
                        log.action === 'CREATE' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                        log.action === 'DELETE' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' :
                        'bg-violet-500/10 text-violet-500 border border-violet-500/20'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-sm font-bold text-white uppercase tracking-tight">{log.collection}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1.5 max-w-xs">
                        {log.changed_fields?.map((f: string) => (
                          <span key={f} className="text-[10px] bg-zinc-900 border border-white/5 rounded px-2 py-0.5 text-slate-400 font-mono">
                            {f}
                          </span>
                        ))}
                        {(!log.changed_fields || log.changed_fields.length === 0) && log.action === 'DELETE' && (
                          <span className="text-[10px] text-slate-600 italic">ID: {log.item_id}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button className="p-2 hover:bg-violet-900/20 rounded-lg transition-all text-slate-500 hover:text-violet-400 opacity-0 group-hover:opacity-100">
                        <Eye className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                filteredAiLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-violet-900/10 transition-colors group">
                    <td className="p-4 text-sm font-mono text-slate-400">
                       <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-violet-500/50" />
                        {format(new Date(log.timestamp), "HH:mm:ss")}
                      </div>
                      <div className="text-[10px] text-slate-600 ml-5">
                        {format(new Date(log.timestamp), "yyyy-MM-dd")}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-violet-950 border border-violet-500/20 flex items-center justify-center">
                          <Cpu className="w-3.5 h-3.5 text-violet-500" />
                        </div>
                        <div className="flex flex-col">
                           <span className="text-sm font-medium text-white tracking-tight">{log.user_email || "System"}</span>
                           <span className="text-[10px] text-violet-400 font-black uppercase italic tracking-tighter leading-none mt-0.5">{log.model}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-slate-300 font-medium tracking-tight max-w-md line-clamp-1 italic">
                        "{log.mission_summary}"
                      </p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-[9px] text-slate-600 uppercase font-black tracking-widest">{log.tool_calls_count || 0} tools used</span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center">
                        {log.success ? (
                          <div className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-lg flex items-center gap-1.5">
                             <CheckCircle2 className="w-3 h-3" />
                             <span className="text-[10px] font-black uppercase italic tracking-wider">Success</span>
                          </div>
                        ) : (
                          <div className="bg-rose-500/10 text-rose-500 border border-rose-500/20 px-2 py-0.5 rounded-lg flex items-center gap-1.5">
                             <XCircle className="w-3 h-3" />
                             <span className="text-[10px] font-black uppercase italic tracking-wider">Failed</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                       <div className="flex flex-col">
                          <span className="text-sm font-black text-white italic tracking-tighter">${Number(log.estimated_cost_usd || 0).toFixed(4)}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{(log.input_tokens + log.output_tokens).toLocaleString()} tokens</span>
                       </div>
                    </td>
                    <td className="p-4 text-right">
                       <span className="text-[10px] font-mono text-slate-700 bg-black/30 px-2 py-1 rounded border border-white/5">
                         {log.session_id?.substring(0, 8)}...
                       </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footer info */}
        <div className="bg-zinc-900/50 p-4 border-t border-white/5 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Zobrazených <span className="text-violet-400 font-bold">{activeTab === 'system' ? filteredLogs.length : filteredAiLogs.length}</span> z <span className="text-violet-400 font-bold">{activeTab === 'system' ? logs.length : aiLogs.length}</span> záznamov
          </span>
          <span className="text-[10px] text-slate-600 uppercase tracking-widest font-black italic">
            CRM Security Shield Active
          </span>
        </div>
      </div>
    </div>
  );
}
