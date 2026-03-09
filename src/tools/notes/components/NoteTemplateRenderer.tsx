"use client";

import * as React from "react";
import { 
  Settings, 
  Tag, 
  Palette, 
  MessageSquare, 
  Database,
  ChevronRight,
  ShieldCheck
} from "lucide-react";

interface NoteTemplateRendererProps {
  data: any;
  onUpdate: (updatedData: any) => void;
}

export function NoteTemplateRenderer({ data, onUpdate }: NoteTemplateRendererProps) {
  // If it's the Leads Inbox Settings pattern
// --- 1. AI AUDIT & AUTOMATION TEMPLATE ---
  if (data.type === 'strategic_audit') {
    return (
      <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex items-center gap-5 bg-blue-600/5 p-8 rounded-[2.5rem] border border-blue-500/10">
          <div className="p-4 bg-blue-600 rounded-2xl shadow-xl shadow-blue-600/20">
            <Zap className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tighter uppercase italic">{data.client_name || 'Nový Audit'}</h2>
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.4em] mt-1">AI STRATEGIC AUDIT • {new Date().getFullYear()}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="bg-white dark:bg-zinc-900/50 p-8 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800/50 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-blue-500 mb-2">
              <AlertCircle size={16} />
              <h3 className="text-[11px] font-black uppercase tracking-widest">Identifikované Pain Points</h3>
            </div>
            <ul className="space-y-3">
              {data.pain_points?.map((point: string, i: number) => (
                <li key={i} className="flex gap-3 text-[13px] font-bold text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  <span className="text-blue-500 select-none">•</span> {point}
                </li>
              ))}
            </ul>
          </section>

          <section className="bg-violet-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-violet-600/20 space-y-4 flex flex-col justify-center">
             <div className="flex items-center gap-2 text-violet-200 mb-2">
              <Sparkles size={16} />
              <h3 className="text-[11px] font-black uppercase tracking-widest">Navrhované AI Riešenie</h3>
            </div>
            <p className="text-lg font-black leading-tight italic">"{data.proposed_solution}"</p>
            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
               <span className="text-[10px] font-bold uppercase tracking-widest text-violet-200">Odhadovaná úspora</span>
               <span className="text-xl font-black">{data.est_savings} hod / mes</span>
            </div>
          </section>
        </div>

        <div className="bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-800">
           <div className="flex items-center gap-3 mb-6">
              <TrendingUp size={18} className="text-emerald-400" />
              <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Implementačný Plán</h3>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {data.steps?.map((step: any, i: number) => (
                <div key={i} className="p-5 bg-zinc-800/50 rounded-2xl border border-zinc-700/50">
                   <span className="block text-[32px] font-black text-zinc-700 mb-2 leading-none">{i+1}</span>
                   <p className="text-[12px] font-bold text-zinc-300 leading-snug">{step}</p>
                </div>
              ))}
           </div>
        </div>
      </div>
    );
  }

  // --- 2. OUTREACH STRATEGY TEMPLATE ---
  if (data.type === 'outreach_strategy') {
    return (
      <div className="space-y-8 animate-in fade-in duration-700">
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-violet-600 flex items-center justify-center text-white">
                <Target size={22} />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight">{data.niche || 'Outreach Plán'}</h2>
                <div className="flex items-center gap-2 mt-1">
                   <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                   <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Active Campaign Strategy</span>
                </div>
              </div>
           </div>
           <div className="px-6 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-[10px] font-black text-violet-400 uppercase tracking-widest">
              Verzia {data.version || '1.0'}
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-2 space-y-6">
              <div className="p-8 bg-white dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 rounded-[2.5rem]">
                 <h4 className="text-[11px] font-black text-violet-500 uppercase tracking-[0.3em] mb-4">Core Hook / Uhlo Pohľadu</h4>
                 <p className="text-[20px] font-black text-zinc-900 dark:text-zinc-100 italic leading-tight">
                   "{data.hook}"
                 </p>
              </div>
              <div className="grid grid-cols-2 gap-6">
                 <div className="p-6 bg-zinc-50 dark:bg-zinc-900/30 rounded-3xl border border-zinc-100 dark:border-zinc-800">
                    <h5 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Pain Points</h5>
                    <ul className="space-y-2">
                       {data.pain_points?.map((p: string, i: number) => (
                         <li key={i} className="text-[12px] font-bold text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                           <div className="w-1 h-1 rounded-full bg-red-400" /> {p}
                         </li>
                       ))}
                    </ul>
                 </div>
                 <div className="p-6 bg-zinc-50 dark:bg-zinc-900/30 rounded-3xl border border-zinc-100 dark:border-zinc-800">
                    <h5 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Objection Handling</h5>
                    <ul className="space-y-2">
                       {data.objections?.map((o: any, i: number) => (
                         <li key={i} className="text-[12px] font-bold text-zinc-600 dark:text-zinc-400">
                            <span className="text-violet-500">Q:</span> {o.q} <br/>
                            <span className="text-zinc-300 font-medium">A:</span> {o.a}
                         </li>
                       ))}
                    </ul>
                 </div>
              </div>
           </div>
           <div className="space-y-6">
              <div className="p-8 bg-violet-500/5 border border-violet-500/10 rounded-[2.5rem] h-full">
                 <h4 className="text-[11px] font-black text-violet-500 uppercase tracking-[0.3em] mb-6">Workflow Kalendár</h4>
                 <div className="space-y-6">
                    {data.follow_up_plan?.map((step: any, i: number) => (
                      <div key={i} className="relative pl-6 border-l border-violet-500/20">
                         <div className="absolute top-0 left-[-4px] w-2 h-2 rounded-full bg-violet-600" />
                         <span className="text-[9px] font-black text-violet-400 uppercase tracking-widest block mb-1">Deň {step.day}</span>
                         <p className="text-[12px] font-bold text-zinc-900 dark:text-zinc-200">{step.action}</p>
                      </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      </div>
    );
  }

  // --- 3. MEETING INTELLIGENCE TEMPLATE ---
  if (data.type === 'meeting_intel') {
    return (
      <div className="space-y-8 animate-in fade-in duration-700">
         <div className="flex items-center gap-4">
            <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-800">
               <MessageSquare size={20} className="text-violet-500" />
            </div>
            <div>
               <h2 className="text-xl font-black italic tracking-tighter uppercase">{data.title || 'Meeting Notes'}</h2>
               <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">{data.date} • {data.participants?.length} Účastníci</p>
            </div>
         </div>

         <div className="grid grid-cols-12 gap-8">
            <div className="col-span-8 p-10 bg-white dark:bg-zinc-900/50 rounded-[3rem] border border-zinc-100 dark:border-zinc-800 shadow-sm">
               <h4 className="text-[11px] font-black text-violet-500 uppercase tracking-[0.3em] mb-8">Hlavné Rozhodnutia & Závery</h4>
               <div className="space-y-6">
                  {data.takeaways?.map((t: string, i: number) => (
                    <div key={i} className="flex gap-4 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-2xl transition-all">
                       <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                       <p className="text-[14px] font-bold text-zinc-800 dark:text-zinc-200">{t}</p>
                    </div>
                  ))}
               </div>
            </div>
            <div className="col-span-4 space-y-6">
               <div className="p-8 bg-zinc-900 rounded-[2.5rem] border border-zinc-800 space-y-4">
                  <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Sentiment Klienta</h4>
                  <div className="flex items-center gap-4">
                     <div className="h-1 flex-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-violet-500 shadow-[0_0_10px_#8b5cf6]" style={{ width: `${data.sentiment_score || 80}%` }} />
                     </div>
                     <span className="text-[10px] font-black text-violet-400">{data.sentiment_label || 'Pozitívny'}</span>
                  </div>
               </div>
               <div className="p-8 bg-violet-600 rounded-[2.5rem] text-white space-y-4">
                  <h4 className="text-[10px] font-black text-violet-200 uppercase tracking-widest">Next Action Item</h4>
                  <p className="text-[15px] font-black italic font-serif leading-tight">"{data.critical_next_step}"</p>
                  <button className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">
                     Priradiť do CRM
                  </button>
               </div>
            </div>
         </div>
      </div>
    );
  }

  // --- FALLBACK FOR REMAINING DATA ---
  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
      <div className="flex items-center gap-3">
        <Database size={20} className="text-violet-500" />
        <h2 className="text-lg font-black uppercase tracking-widest italic text-foreground">Štruktúrované Dáta</h2>
      </div>
      <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/50 rounded-[2rem] p-8">
        <pre className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap thin-scrollbar max-h-[500px] overflow-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  );
}

