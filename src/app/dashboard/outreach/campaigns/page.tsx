"use client";

import React, { useState, useEffect } from "react";
import { Zap, Save, Plus, ArrowLeft, Send, Clock, Mail, ChevronRight, Loader2 } from "lucide-react";
import { getOutreachCampaigns, saveOutreachCampaign, getOutreachLeadForPreview } from "@/app/actions/outreach";
import { toast } from "sonner";
import Link from "next/link";

export default function OutreachCampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sampleLead, setSampleLead] = useState<any>(null);
  const [formData, setFormData] = useState({
    id: null,
    name: "",
    subject: "",
    body: "",
    followup_subject: "",
    followup_body: "",
    followup_days: 3
  });
  const [lastFocused, setLastFocused] = useState<{ id: string; selectionStart: number } | null>(null);

  const updateCursorPos = (e: any) => {
    setLastFocused({
        id: e.target.id,
        selectionStart: e.target.selectionStart
    });
  };

  const insertVariable = (v: string) => {
    if (!lastFocused) {
        toast.info("Najprv kliknite do textového poľa.");
        return;
    }

    const field = lastFocused.id as keyof typeof formData;
    const currentVal = String(formData[field] || "");
    const start = lastFocused.selectionStart;
    
    const newVal = currentVal.substring(0, start) + v + currentVal.substring(start);
    setFormData({ ...formData, [field]: newVal });
    
    // Increment position for next insert
    setLastFocused({
        ...lastFocused,
        selectionStart: start + v.length
    });
  };

  const variables = [
    { label: 'Meno', value: '{{first_name}}' },
    { label: 'Firma', value: '{{company_name}}' },
    { label: 'Web', value: '{{website}}' },
    { label: 'Email', value: '{{email}}' },
    { label: 'Kategória', value: '{{category}}' },
    { label: 'AI Intro', value: '{{ai_intro}}' },
  ];

  const refreshCampaigns = async (silent = false) => {
    if (!silent) setLoading(true);
    const [campRes, leadRes] = await Promise.all([
        getOutreachCampaigns(),
        getOutreachLeadForPreview()
    ]);

    if (campRes.success) setCampaigns(campRes.data);
    if (leadRes.success && leadRes.data) {
        setSampleLead(leadRes.data);
    }
    setLoading(false);
  };

  const replaceVariables = (text: string) => {
    if (!text) return "";
    if (!sampleLead) return text;

    return text
        .replace(/{{first_name}}/g, sampleLead.first_name || "Meno")
        .replace(/{{company_name}}/g, sampleLead.company_name || sampleLead.company || "Firma")
        .replace(/{{email}}/g, sampleLead.email || "email@klient.sk")
        .replace(/{{website}}/g, sampleLead.website || "www.web.sk")
        .replace(/{{category}}/g, sampleLead.category || "Služby")
        .replace(/{{ai_intro}}/g, sampleLead.ai_first_sentence || "Zaujala ma Vaša práca...");
  };

  useEffect(() => {
    refreshCampaigns();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await saveOutreachCampaign(formData);
    if (res.success) {
      toast.success("Kampaň bola uložená");
      setIsEditing(false);
      refreshCampaigns();
    } else {
      toast.error("Chyba: " + res.error);
    }
    setSaving(false);
  };

  const startNew = () => {
    setFormData({
      id: null,
      name: "",
      subject: "",
      body: "",
      followup_subject: "",
      followup_body: "",
      followup_days: 3
    });
    setIsEditing(true);
  };

  const editCampaign = (c: any) => {
    setFormData({
        id: c.id,
        name: c.name || "",
        subject: c.subject || "",
        body: c.body || "",
        followup_subject: c.followup_subject || "",
        followup_body: c.followup_body || "",
        followup_days: c.followup_days || 3
    });
    setIsEditing(true);
  };

  if (isEditing) {
    return (
      <div className="p-8 max-w-5xl mx-auto animate-in slide-in-from-right-10 duration-500">
        <button onClick={() => setIsEditing(false)} className="mb-6 flex items-center gap-2 text-muted-foreground hover:text-foreground font-bold transition-all group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Späť na zoznam
        </button>

        <form onSubmit={handleSave} className="space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-black">
                    {formData.id ? "Upraviť kampaň" : "Nová kampaň"}
                </h2>
                <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-3xl font-black flex items-center gap-2 shadow-xl shadow-blue-600/20 active:scale-95 transition-all">
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Uložiť kampaň
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="bg-card border border-border p-8 rounded-[3rem] shadow-sm space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Názov kampane</label>
                        <input
                            type="text"
                            required
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-border rounded-2xl px-5 py-4 font-bold outline-none focus:ring-2 focus:ring-blue-600/20"
                            placeholder="Napr. Cold Outreach - CEO Slovakia"
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                        />
                    </div>

                    <div className="p-6 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/50 rounded-[2rem]">
                        <p className="text-[10px] font-black uppercase text-blue-600 mb-3 ml-1 tracking-widest">Kliknutím vložíte premennú:</p>
                        <div className="flex flex-wrap gap-2">
                            {variables.map(v => (
                                <button 
                                    key={v.value} 
                                    type="button"
                                    onClick={() => insertVariable(v.value)}
                                    className="bg-white dark:bg-slate-900 hover:bg-blue-600 hover:text-white px-4 py-2 rounded-xl border border-blue-200 dark:border-blue-800 text-xs font-black text-blue-800 dark:text-blue-400 transition-all active:scale-95 shadow-sm"
                                >
                                    {v.label} <span className="opacity-50 font-medium ml-1">{v.value}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-6 pt-4">
                        <h3 className="text-lg font-black flex items-center gap-2">
                            <Mail className="w-5 h-5 text-blue-600" />
                            Prvotný Email
                        </h3>
                        <div className="space-y-4">
                            <input
                                id="subject"
                                type="text"
                                required
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-border rounded-2xl px-5 py-4 font-bold outline-none focus:ring-2 focus:ring-blue-600/20"
                                placeholder="Predmet emailu..."
                                value={formData.subject}
                                onChange={e => setFormData({...formData, subject: e.target.value})}
                                onSelect={updateCursorPos}
                                onClick={updateCursorPos}
                                onKeyUp={updateCursorPos}
                            />
                            <textarea
                                id="body"
                                required
                                rows={8}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-border rounded-2xl px-5 py-4 font-medium outline-none focus:ring-2 focus:ring-blue-600/20 resize-none"
                                placeholder="Text emailu..."
                                value={formData.body}
                                onChange={e => setFormData({...formData, body: e.target.value})}
                                onSelect={updateCursorPos}
                                onClick={updateCursorPos}
                                onKeyUp={updateCursorPos}
                            />
                        </div>
                    </div>

                    <div className="space-y-6 pt-8 border-t border-border">
                        <h3 className="text-lg font-black flex items-center gap-2">
                            <Clock className="w-5 h-5 text-orange-500" />
                            Automatický Follow-up
                        </h3>
                        <div className="flex items-center gap-4 mb-4">
                            <span className="text-sm font-bold">Poslať po</span>
                            <input
                                type="number"
                                className="w-20 bg-slate-50 dark:bg-slate-900 border border-border rounded-xl px-3 py-2 font-black text-center outline-none"
                                value={formData.followup_days}
                                onChange={e => setFormData({...formData, followup_days: parseInt(e.target.value)})}
                            />
                            <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider text-[10px]">dňoch neaktivity</span>
                        </div>
                        <div className="space-y-4">
                            <input
                                id="followup_subject"
                                type="text"
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-border rounded-2xl px-5 py-4 font-bold outline-none focus:ring-2 focus:ring-blue-600/20 opacity-80"
                                placeholder="Predmet (nechajte prázdne pre RO...)"
                                value={formData.followup_subject}
                                onChange={e => setFormData({...formData, followup_subject: e.target.value})}
                                onSelect={updateCursorPos}
                                onClick={updateCursorPos}
                                onKeyUp={updateCursorPos}
                            />
                            <textarea
                                id="followup_body"
                                rows={6}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-border rounded-2xl px-5 py-4 font-medium outline-none focus:ring-2 focus:ring-blue-600/20 resize-none"
                                placeholder="Text follow-up emailu..."
                                value={formData.followup_body}
                                onChange={e => setFormData({...formData, followup_body: e.target.value})}
                                onSelect={updateCursorPos}
                                onClick={updateCursorPos}
                                onKeyUp={updateCursorPos}
                            />
                        </div>
                    </div>
                </div>

                {/* RIGHT: LIVE PREVIEW */}
                <div className="lg:sticky lg:top-8 space-y-6">
                    <div className="bg-slate-900 text-white rounded-[3rem] p-4 shadow-2xl overflow-hidden border-8 border-slate-800">
                        <div className="bg-slate-800/50 px-6 py-4 border-b border-white/5 flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-red-500/50" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                            <div className="w-3 h-3 rounded-full bg-green-500/50" />
                            <span className="text-[10px] font-black uppercase tracking-tighter opacity-30 ml-auto mr-4">Preview</span>
                        </div>
                        
                        <div className="p-8 space-y-8">
                            {/* EMAIL HEADER */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-black text-xs uppercase">
                                        {sampleLead?.first_name?.[0] || sampleLead?.email?.[0] || "L"}
                                    </div>
                                    <div>
                                        <p className="text-xs font-black">{sampleLead?.first_name || "Meno Leadov"}</p>
                                        <p className="text-[10px] opacity-40">{sampleLead?.email || "email@klient.sk"}</p>
                                    </div>
                                    <div className="ml-auto text-[10px] opacity-20 font-mono italic">Práve teraz</div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Predmet</p>
                                    <h4 className="text-lg font-black text-blue-400 leading-tight">
                                        {replaceVariables(formData.subject) || "..."}
                                    </h4>
                                </div>
                            </div>

                            {/* EMAIL BODY */}
                            <div className="bg-white/5 rounded-2xl p-6 min-h-[250px] border border-white/5 backdrop-blur-sm">
                                <p className="text-sm leading-relaxed whitespace-pre-wrap opacity-90">
                                    {replaceVariables(formData.body) || "Sem sa zobrazí náhľad Vášho emailu so skutočnými údajmi..."}
                                </p>
                            </div>

                            {/* FOLLOWUP PREVIEW */}
                            {formData.followup_body && (
                                <div className="space-y-4 mt-8 opacity-60 border-t border-white/5 pt-8">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Clock className="w-3 h-3 text-orange-500" />
                                        <span className="text-[10px] font-black uppercase tracking-tighter text-orange-500">
                                            Follow-up po {formData.followup_days} dňoch
                                        </span>
                                    </div>
                                    <div className="p-6 bg-orange-500/5 rounded-2xl border border-orange-500/10">
                                        <p className="text-sm italic opacity-80 whitespace-pre-wrap">
                                            {replaceVariables(formData.followup_body)}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-card border border-border p-6 rounded-[2.5rem] shadow-sm space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">Použité dáta z prvého leadu:</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <p className="text-[9px] opacity-40 font-black uppercase">Meno</p>
                                <p className="text-xs font-black truncate">{sampleLead?.first_name || "Neznáme"}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] opacity-40 font-black uppercase">Firma</p>
                                <p className="text-xs font-black truncate">{sampleLead?.company_name || sampleLead?.company || "Neznáma"}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </form>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Link href="/dashboard/outreach" className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-blue-600 transition-colors mb-2 w-fit">
            <ArrowLeft className="w-3.5 h-3.5" />
            Späť na Outreach
          </Link>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <Send className="w-8 h-8 text-blue-600" />
            Outreach Kampane
          </h1>
          <p className="text-muted-foreground font-medium flex items-center gap-2">
            Vytvorte a spravujte svoje automatizované sekvencie.
            {loading && <span className="flex items-center gap-1.5 text-blue-600 text-xs font-black animate-pulse ml-2"><Loader2 className="w-3 h-3 animate-spin" /> Synchronizujem so SmartLead...</span>}
          </p>
        </div>
        <button onClick={startNew} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-3xl font-black flex items-center gap-2 shadow-xl shadow-blue-600/20 active:scale-95 transition-all">
          <Plus className="w-5 h-5" />
          Nová kampaň
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
           [1,2,3].map(i => (
            <div key={i} className="bg-card border border-border rounded-[2.5rem] p-8 h-48 animate-pulse"></div>
           ))
        ) : campaigns.length === 0 ? (
          <div className="col-span-full py-20 bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-border flex flex-col items-center gap-4">
             <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Send className="w-8 h-8 text-slate-300" />
             </div>
             <p className="text-muted-foreground font-bold">Zatiaľ nemáte žiadne kampane.</p>
             <button onClick={startNew} className="text-blue-600 font-black hover:underline underline-offset-4">Vytvorte prvú hneď teraz</button>
          </div>
        ) : (
          campaigns.map(c => (
            <div key={c.id} onClick={() => editCampaign(c)} className="bg-card border border-border p-8 rounded-[3.5rem] shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer group flex flex-col justify-between min-h-[220px]">
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-4 rounded-3xl bg-blue-50 dark:bg-blue-900/10 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                            <Send className="w-6 h-6" />
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-600 transition-colors" />
                    </div>
                    <h3 className="text-xl font-black truncate">{c.name}</h3>
                    <p className="text-xs font-medium text-muted-foreground line-clamp-1 mt-1">{c.subject}</p>
                </div>
                <div className="flex items-center gap-3 mt-6">
                    <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 w-0"></div>
                    </div>
                    <span className="text-[10px] font-black text-muted-foreground">0% Sended</span>
                </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
