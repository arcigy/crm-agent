"use client";

import React, { useState, useEffect } from "react";
import { 
  CreditCard, 
  ArrowLeft, 
  RefreshCcw, 
  ShieldCheck, 
  Zap, 
  Clock, 
  History, 
  Users, 
  Mail, 
  Calendar, 
  CheckCircle2,
  ExternalLink,
  Bot,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { PremiumLoader } from "@/components/ui/PremiumLoader";
import { getBillingInfo, createPortalSession } from "@/app/actions/billing";
import { BillingStatus } from "@/types/billing";

export default function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<BillingStatus | null>(null);

  useEffect(() => {
    async function load() {
      const data = await getBillingInfo();
      setStatus(data);
      setLoading(false);
    }
    load();
  }, []);

  const handleManage = async () => {
    setProcessing(true);
    try {
      const res = await createPortalSession();
      if (res.url) {
        window.location.href = res.url;
      }
    } catch (e) {
      toast.error("Nepodarilo sa otvoriť Stripe Portál.");
      setProcessing(false);
    }
  };

  const handleManualSync = async () => {
    setProcessing(true);
    try {
      const response = await fetch("/api/billing/sync", { method: "POST" });
      const result = await response.json();
      if (result.success) {
        toast.success("Stav predplatného bol úspešne synchronizovaný!");
        const data = await getBillingInfo();
        setStatus(data);
      } else {
        toast.error(result.message || result.error || "Synchronizácia zlyhala.");
      }
    } catch (e) {
      toast.error("Chyba pri komunikácii so serverom.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <PremiumLoader message="Načítavanie..." />;
  }

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-1000 pt-4 pb-20 px-4 md:px-0 relative">
      {/* ── Billing Console Window ── */}
      <div className="bg-zinc-950/40 backdrop-blur-3xl border border-white/[0.03] rounded-[3.5rem] p-6 md:p-8 shadow-[0_40px_100px_rgba(0,0,0,0.6)] relative overflow-hidden">
        
        {/* Header - Console Style */}
        <div className="flex items-center justify-between pb-8 border-b border-white/[0.03] mb-6">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black tracking-tighter text-zinc-100 uppercase italic drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">
                Billing <span className="text-zinc-100">Registry</span> Console
              </h1>
            </div>
            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.4em]">
              Správa licencií a finančných oprávnení systému
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {status?.isActive && (
              <button 
                onClick={handleManualSync}
                disabled={processing}
                className="p-3 bg-violet-600/5 border border-violet-500/20 rounded-2xl hover:bg-violet-600/15 transition-all text-violet-400 group"
                title="Synchronizovať stav"
              >
                <RefreshCcw className={`w-3.5 h-3.5 ${processing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
              </button>
            )}
            
            <Link href="/dashboard/settings">
              <button className="px-6 py-2.5 bg-violet-600/5 backdrop-blur-2xl border border-violet-500/20 rounded-2xl hover:bg-violet-600/15 hover:border-violet-400/40 transition-all flex items-center gap-2 group shadow-[0_0_15px_rgba(139,92,246,0.05)]">
                <ArrowLeft className="w-3.5 h-3.5 text-violet-400 group-hover:text-violet-300 transition-colors" />
                <span className="text-[8px] font-black uppercase tracking-widest text-violet-400 group-hover:text-violet-300 transition-colors">Back System</span>
              </button>
            </Link>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-10">
          
          {/* Section 1: Subscription Status */}
          <div className="space-y-6">
            <div className="flex items-center justify-end px-2">
              {status?.isActive && (
                <button 
                  onClick={handleManage}
                  disabled={processing}
                  className="flex items-center gap-2 px-4 py-1.5 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.05] transition-all group"
                >
                  <ExternalLink className="w-3 h-3 text-zinc-500 group-hover:text-violet-400 transition-colors" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-violet-400 transition-colors">Stripe Portal</span>
                </button>
              )}
            </div>

            <div className="bg-black/40 border border-white/5 rounded-[2rem] p-6 md:p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
              
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                <div className="flex items-center gap-6 text-center md:text-left flex-col md:flex-row">
                   <div className="relative">
                      <div className={`w-20 h-20 rounded-2xl bg-zinc-900 border ${status?.isActive ? 'border-violet-500/20 shadow-[0_0_30px_rgba(139,92,246,0.1)]' : 'border-zinc-800'} flex items-center justify-center overflow-hidden`}>
                         <Bot className={`w-8 h-8 ${status?.isActive ? 'text-violet-400 animate-pulse' : 'text-zinc-700'}`} />
                      </div>
                      {status?.isActive && (
                        <div className="absolute -top-1.5 -right-1.5 w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center border-4 border-zinc-950 shadow-2xl">
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        </div>
                      )}
                   </div>
                   
                   <div className="flex flex-col gap-1">
                      <h2 className="text-2xl font-black uppercase italic tracking-tighter text-zinc-100 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                         {status?.planName}
                      </h2>
                      <div className="flex items-center justify-center md:justify-start gap-3">
                         <div className={`w-1.5 h-1.5 rounded-full ${status?.isActive ? 'bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.6)] animate-pulse' : 'bg-zinc-700'}`} />
                         <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">
                            Registry_Context: <span className={status?.isActive ? "text-violet-400" : ""}>{status?.status}</span>
                         </span>
                      </div>
                   </div>
                </div>

                <div className="flex flex-col items-center md:items-end gap-2 text-center md:text-right">
                   <div className="flex items-center gap-3 bg-zinc-900/50 px-4 py-2 rounded-xl border border-white/5 shadow-inner">
                      <Clock className="w-3 h-3 text-zinc-500" />
                      <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest italic leading-none pt-0.5">
                         {status?.nextBillingDate || 'No active cycle'}
                      </span>
                    </div>
                    {status?.status === 'past_due' && (
                      <div className="flex items-center gap-2 mt-1 px-3 py-1 bg-red-500/5 border border-red-500/20 rounded-lg animate-pulse">
                        <AlertCircle className="w-3 h-3 text-red-500" />
                        <span className="text-[8px] font-black text-red-500 uppercase tracking-[0.2em]">Critical_Payment_Issue</span>
                      </div>
                    )}
                 </div>
              </div>

              {/* Resource Metrics */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-white/[0.03]">
                 <UsageStat icon={Users} label="Contacts_Registry" current={1240} total={status?.isActive ? '∞' : 100} color="text-violet-400" />
                 <UsageStat icon={Zap} label="Cold_Outreach_Ops" current={450} total={status?.isActive ? '∞' : 50} color="text-zinc-600" />
                 <UsageStat icon={History} label="Intelligence_Retention" current={85} total={100} unit="%" color="text-zinc-500" />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <BenefitItem 
                 title="SSL_Encryption" 
                 desc="End-to-end transakčné šifrovanie cez Stripe." 
               />
               <BenefitItem 
                 title="Zero_Storage" 
                 desc="Žiadne ukladanie platobných kariet." 
               />
               <BenefitItem 
                 title="L4_Compliance" 
                 desc="Súlad s GDPR a PCI-DSS standardmi." 
               />
            </div>
          </div>
        </div>

      </div>

      <style jsx global>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

function UsageStat({ icon: Icon, label, current, total, color, unit = "" }: any) {
  const percentage = typeof total === 'number' ? (current / total) * 100 : 0;
  
  return (
    <div className="p-6 bg-zinc-950/30 border border-white/5 rounded-3xl group/stat">
       <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
             <Icon className={`w-3 h-3 ${color}`} />
             <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em] italic">{label}</span>
          </div>
          <span className="text-[9px] font-black text-zinc-300 uppercase italic leading-none">{current}{unit}</span>
       </div>
       <div className="h-1.5 w-full bg-zinc-900/50 rounded-full overflow-hidden border border-white/[0.03] shadow-inner">
          <div 
             className={`h-full bg-current transition-all duration-1000 ${color} shadow-[0_0_15px_currentColor] opacity-60`} 
             style={{ width: `${Math.min(100, percentage)}%` }} 
          />
       </div>
    </div>
  );
}

function BenefitItem({ title, desc }: { title: string, desc: string }) {
  return (
    <div className="p-6 bg-black/20 border border-white/5 rounded-3xl flex flex-col gap-3">
       <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-violet-600 shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
          <h4 className="text-[11px] font-black text-zinc-200 uppercase tracking-widest italic">{title}</h4>
       </div>
       <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-wide leading-relaxed pl-4 line-clamp-2">{desc}</p>
    </div>
  );
}
