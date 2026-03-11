"use client";

import * as React from "react";
import { 
  Bot, 
  Save, 
  RefreshCcw, 
  ArrowLeft, 
  Zap, 
  ShieldAlert, 
  BellRing,
  Cpu,
  MousePointer2,
  Lock,
  ChevronRight
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { PremiumLoader } from "@/components/ui/PremiumLoader";
import { getAgentSettings, updateAgentSettings, AgentSettings } from "@/app/actions/agent-settings";

export default function AgentSettingsPage() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [formData, setFormData] = React.useState<AgentSettings>({
    agent_name: "ArciGy Agent",
    mode: "balanced",
    proactive: true,
    confidence_threshold: 65,
    tools_allowed: ["contacts", "calendar", "notes"],
    notifications: "browser",
    memory_recall: "medium",
  });

  React.useEffect(() => {
    async function load() {
      const data = await getAgentSettings();
      setFormData(data);
      setFormData(prev => ({...prev, tools_allowed: prev.tools_allowed ?? []}));
      setLoading(false);
    }
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updateAgentSettings(formData);
      if (res.success) {
        toast.success("Konfigurácia agenta bola aktualizovaná a nasadená.");
      } else {
        toast.error(res.error || "Chyba pri ukladaní konfigurácie.");
      }
    } catch (e) {
      toast.error("Systémová chyry pri komunikácii s jadrom.");
    } finally {
      setSaving(false);
    }
  };

  const toggleTool = (tool: string) => {
    setFormData(prev => ({
      ...prev,
      tools_allowed: prev.tools_allowed.includes(tool)
        ? prev.tools_allowed.filter(t => t !== tool)
        : [...prev.tools_allowed, tool]
    }));
  };

  if (loading) {
    return <PremiumLoader message="Načítavanie..." />;
  }

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-1000 pt-10 pb-20 px-4 md:px-0 relative">
      {/* ── Background Ambiance (Grey Tech) ── */}
      <div className="absolute top-[-100px] left-0 w-[500px] h-[500px] bg-white/[0.01] rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* ── Settings Console Window ── */}
      <div className="bg-zinc-950/40 backdrop-blur-3xl border border-white/[0.03] rounded-[3.5rem] p-8 md:p-12 shadow-[0_40px_100px_rgba(0,0,0,0.6)] relative overflow-hidden">
        
        {/* Header - Console Style */}
        <div className="flex items-center justify-between pb-8 border-b border-white/[0.03] mb-10">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black tracking-tighter text-zinc-100 uppercase italic drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">
                Agent <span className="text-zinc-100">Control</span> Console
              </h1>
            </div>
            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.4em]">
              Riadenie správania a oprávnení ArciGy AI entity
            </p>
          </div>
          
          <Link href="/dashboard/settings">
            <button className="px-6 py-2.5 bg-violet-600/5 backdrop-blur-2xl border border-violet-500/20 rounded-2xl hover:bg-violet-600/15 hover:border-violet-400/40 transition-all flex items-center gap-2 group shadow-[0_0_15px_rgba(139,92,246,0.05)]">
              <ArrowLeft className="w-3.5 h-3.5 text-violet-400 group-hover:text-violet-300 transition-colors" />
              <span className="text-[8px] font-black uppercase tracking-widest text-violet-400 group-hover:text-violet-300 transition-colors">Back System</span>
            </button>
          </Link>
        </div>

        {/* Settings Sections */}
        <div className="space-y-12">
          
          {/* Section 1: Behavior & Core */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 px-2">
              <Cpu className="w-4 h-4 text-zinc-500" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-500 italic">Behavior_Core_v2</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-black/40 border border-white/5 rounded-3xl p-6 transition-all hover:border-white/10 group">
                <label className="text-[9px] font-black text-zinc-700 uppercase tracking-[0.4em] mb-4 block">Názov Identity</label>
                <input 
                  type="text" 
                  value={formData.agent_name}
                  onChange={e => setFormData({...formData, agent_name: e.target.value})}
                  className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-5 py-4 text-sm font-bold text-zinc-100 focus:outline-none focus:border-zinc-500 transition-all italic tracking-wide"
                />
              </div>
              
              <div className="bg-black/40 border border-white/5 rounded-3xl p-6 transition-all hover:border-white/10">
                <label className="text-[9px] font-black text-zinc-700 uppercase tracking-[0.4em] mb-4 block">Pracovný Režim</label>
                <div className="flex gap-2 p-1 bg-zinc-900/50 rounded-2xl border border-white/5">
                  {['fast', 'balanced', 'precise'].map(m => (
                    <button
                      key={m}
                      onClick={() => setFormData({...formData, mode: m as any})}
                      className={`flex-1 py-3 px-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${formData.mode === m ? 'bg-zinc-100 text-zinc-950 shadow-xl' : 'text-zinc-600 hover:text-zinc-400'}`}
                    >
                      {m === 'fast' ? 'Rýchlosť' : m === 'balanced' ? 'Balans' : 'Presnosť'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Proactivity & Logic */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 px-2">
              <Zap className="w-4 h-4 text-zinc-500" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-500 italic">Logic_Heuristics_v1</h2>
            </div>
            
            <div className="bg-black/40 border border-white/5 rounded-3xl p-8 flex flex-col md:flex-row md:items-center justify-between gap-8 group">
              <div className="flex items-start gap-5">
                <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center shadow-inner group-hover:bg-zinc-800 transition-colors">
                  <MousePointer2 className="w-5 h-5 text-zinc-400 group-hover:text-zinc-100" />
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="text-[12px] font-black uppercase tracking-widest text-zinc-200">Proaktívne Návrhy</h3>
                  <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.1em] max-w-sm leading-relaxed">
                    Agent bude automaticky sledovať dáta a navrhovať vám úlohy, správy alebo opravy v CRM.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setFormData({...formData, proactive: !formData.proactive})}
                className={`relative w-16 h-8 rounded-full transition-all duration-300 ${formData.proactive ? 'bg-zinc-100 shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'bg-zinc-900'}`}
              >
                <div className={`absolute top-1 left-1 w-6 h-6 rounded-full transition-all duration-500 ${formData.proactive ? 'translate-x-8 bg-zinc-950' : 'bg-zinc-700'}`} />
              </button>
            </div>
          </div>

          {/* Section 3: Tool Permissions */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 px-2">
              <Lock className="w-4 h-4 text-zinc-500" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-500 italic">Access_Privileges_L2</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { id: 'contacts', name: 'Správa Kontaktov', desc: 'Čítanie a zápis klientov' },
                { id: 'calendar', name: 'Plánovanie', desc: 'Prístup ku kalendáru' },
                { id: 'notes', name: 'Poznámky & AI', desc: 'Tvorba dokumentácie' },
                { id: 'billing', name: 'Fakturácia', desc: 'Prístup k Stripe dátam' },
                { id: 'emails', name: 'Komunikácia', desc: 'Čítanie/Odosielanie Gmailu' },
                { id: 'marketing', name: 'Marketing', desc: 'Prístup k Outreach kampaniam' }
              ].map(tool => (
                <button
                  key={tool.id}
                  onClick={() => toggleTool(tool.id)}
                  className={`flex flex-col items-start p-6 rounded-[2rem] border transition-all text-left group ${formData.tools_allowed.includes(tool.id) ? 'bg-zinc-100 border-white text-zinc-950 shadow-2xl' : 'bg-black/40 border-white/5 text-zinc-400 opacity-60 hover:opacity-100'}`}
                >
                  <div className="flex items-center justify-between w-full mb-4">
                    <span className={`text-[8px] font-black uppercase tracking-[0.2em] ${formData.tools_allowed.includes(tool.id) ? 'text-zinc-950' : 'text-zinc-600'}`}>
                      {tool.id}_service
                    </span>
                    <div className={`w-2 h-2 rounded-full ${formData.tools_allowed.includes(tool.id) ? 'bg-zinc-950 animate-pulse' : 'bg-zinc-800'}`} />
                  </div>
                  <h4 className="text-[11px] font-black uppercase italic tracking-widest mb-1">{tool.name}</h4>
                  <p className={`text-[8px] font-bold uppercase leading-none opacity-60`}>{tool.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Section 4: Notifications */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 px-2">
              <BellRing className="w-4 h-4 text-zinc-500" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-500 italic">Communication_Gateway</h2>
            </div>
            
            <div className="bg-black/40 border border-white/5 rounded-3xl p-6 transition-all hover:border-white/10">
              <label className="text-[9px] font-black text-zinc-700 uppercase tracking-[0.4em] mb-6 block">Preferencie Upozornení</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { id: 'browser', name: 'Push Notifikácie', sub: 'Prehliadač / PWA' },
                  { id: 'email', name: 'Email Reporty', sub: 'Denné / Týždenné sumáre' },
                  { id: 'silent', name: 'Iba v Konverzii', sub: 'Ticho mimo chat' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setFormData({...formData, notifications: opt.id as any})}
                    className={`flex items-center gap-4 p-5 rounded-2xl border transition-all text-left ${formData.notifications === opt.id ? 'bg-zinc-100 border-white/20 text-zinc-950' : 'bg-zinc-900/30 border-white/5 text-zinc-400'}`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${formData.notifications === opt.id ? 'border-zinc-950' : 'border-zinc-700'}`}>
                      {formData.notifications === opt.id && <div className="w-2 h-2 bg-zinc-950 rounded-full" />}
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em]">{opt.name}</h4>
                      <p className="text-[7px] font-black uppercase opacity-40 leading-none mt-1">{opt.sub}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Save Action */}
        <div className="mt-20 pt-10 border-t border-white/[0.03] flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-4 py-3 px-6 bg-zinc-900/50 rounded-2xl border border-white/5">
            <ShieldAlert className="w-4 h-4 text-zinc-600" />
            <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest italic">Bezpečnostná Úroveň: ArciGy_Kernel_L4</span>
          </div>

          <button
            disabled={saving}
            onClick={handleSave}
            className="group relative px-14 py-5 bg-zinc-100 text-zinc-950 font-black uppercase tracking-[0.4em] text-[10px] rounded-2xl shadow-[0_15px_40px_rgba(255,255,255,0.05)] hover:bg-white hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] active:scale-95 transition-all flex items-center gap-4 border border-white/20 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite] transition-all" />
            
            {saving ? (
              <RefreshCcw className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5 group-hover:scale-110 transition-transform duration-500" />
            )}
            <span className="relative z-10 drop-shadow-sm font-black italic">Deploy_Configuration</span>
          </button>
        </div>
      </div>
      
      {/* Global CSS for shimmer animation */}
      <style jsx global>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
