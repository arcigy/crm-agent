"use client";

import React, { useState, useEffect } from "react";
import { Save, Plus, ArrowLeft, Send, Clock, Mail, ChevronRight, Loader2, User, RefreshCw, LayoutList } from "lucide-react";
import { getOutreachCampaigns, saveOutreachCampaign } from "@/app/actions/outreach";
import { getColdLeadLists, getPreviewLead } from "@/app/actions/cold-leads";
import { toast } from "sonner";
import Link from "next/link";

import { useUser } from "@clerk/nextjs";

export default function OutreachCampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sampleLead, setSampleLead] = useState<any>(null);
  const [lists, setLists] = useState<any[]>([]);
  const [selectedList, setSelectedList] = useState<string>("");
  const { user } = useUser();

  const [formData, setFormData] = useState({
    id: null,
    name: "",
    subject: "",
    body: "",
    followup_subject: "",
    followup_body: "",
    followup_days: 3,
    smartlead_id: null as number | null,
    selected_list: "",
    auto_sync: false
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

  const leadVariables = [
    { label: 'Meno', value: '{{first_name}}' },
    { label: 'Firma', value: '{{company_name}}' },
    { label: 'Web', value: '{{website}}' },
    { label: 'Email', value: '{{email}}' },
    { label: 'Kategória', value: '{{category}}' },
    { label: 'AI Intro', value: '{{ai_intro}}' },
    { label: 'Oslovenie', value: '{{oslovenie}}' },
  ];

  const senderVariables = [
    { label: 'Odosielateľ (Meno)', value: '%sender-firstname%' },
    { label: 'Odosielateľ (Celé)', value: '%sender-name%' },
  ];

  const refreshCampaigns = React.useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    
    // 1. Load Campaigns & Lists
    const [campRes, listRes] = await Promise.all([
        getOutreachCampaigns(),
        getColdLeadLists()
    ]);

    if (campRes.success) setCampaigns(campRes.data);
    
    let currentListName = selectedList;
    if (listRes.success && listRes.data) {
        setLists(listRes.data);
        // Default to first list if none selected
        if (!currentListName && listRes.data.length > 0) {
            currentListName = listRes.data[0].name;
            setSelectedList(currentListName);
        }
    }

    // 2. Load Preview Lead based on selected list
    if (currentListName) {
        const leadRes = await getPreviewLead(currentListName);
        if (leadRes.success && leadRes.data) {
            setSampleLead(leadRes.data);
        } else {
            setSampleLead(null);
        }
    }
    
    setLoading(false);
  }, [selectedList, setLists]);
  useEffect(() => {
    if (selectedList) {
        getPreviewLead(selectedList).then(res => {
            if (res.success && res.data) setSampleLead(res.data);
            else setSampleLead(null);
        });
    }
  }, [selectedList]);

  const replaceVariables = (text: string) => {
    if (!text) return "";
    if (!sampleLead) return text;

    return text
        .replace(/{{first_name}}/g, sampleLead.title || "Meno")
        .replace(/{{company_name}}/g, sampleLead.company_name_reworked || "Firma")
        .replace(/{{email}}/g, sampleLead.email || "email@klient.sk")
        .replace(/{{website}}/g, sampleLead.website || "www.web.sk")
        .replace(/{{category}}/g, sampleLead.category || "Služby")
        .replace(/{{ai_intro}}/g, sampleLead.ai_first_sentence || "Zaujala ma Vaša práca...")
        .replace(/{{oslovenie}}/g, (sampleLead.ai_first_sentence || "Dobrý deň").split('\n')[0])
        .replace(/%sender-firstname%/g, user?.firstName || "Andrej/Branislav")
        .replace(/%sender-name%/g, user?.fullName || "Andrej/Branislav Priezvisko");
  };

  useEffect(() => {
    refreshCampaigns();
  }, [refreshCampaigns]);

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
      followup_days: 3,
      smartlead_id: null,
      selected_list: "",
      auto_sync: false
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
        followup_days: c.followup_days || 3,
        smartlead_id: c.smartlead_id || null,
        selected_list: c.selected_list || "",
        auto_sync: c.auto_sync || false
    });
    if (c.selected_list) setSelectedList(c.selected_list);
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

                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Vyberte zoznam kontaktov</label>
                        <div className="relative">
                            <LayoutList className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                            <select
                                value={selectedList}
                                onChange={(e) => {
                                    setSelectedList(e.target.value);
                                    setFormData({...formData, selected_list: e.target.value});
                                }}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-border rounded-2xl pl-12 pr-5 py-4 font-bold outline-none focus:ring-2 focus:ring-blue-600/20 appearance-none cursor-pointer"
                            >
                                <option value="" disabled>-- Vyberte zoznam --</option>
                                {lists.map(l => (
                                    <option key={l.id} value={l.name}>{l.name}</option>
                                ))}
                            </select>
                            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 rotate-90 pointer-events-none" />
                        </div>
                        <p className="text-[10px] text-muted-foreground px-2">Prehľad vpravo sa aktualizuje podľa prvého kontaktu z tohto zoznamu.</p>
                        
                        <div className="flex items-center gap-3 mt-4 p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-800/30 rounded-2xl">
                            <div className="flex-1">
                                <p className="text-sm font-bold text-orange-900 dark:text-orange-200">Automatický import do SmartLead</p>
                                <p className="text-[10px] text-orange-700 dark:text-orange-400/70">Ak je zapnuté, každý kontakt v tomto zozname s emailom a AI introm sa automaticky odošle do kampane.</p>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setFormData({...formData, auto_sync: !formData.auto_sync})}
                                className={`w-12 h-6 rounded-full transition-colors relative ${formData.auto_sync ? 'bg-orange-500' : 'bg-slate-300'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.auto_sync ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>
                    </div>

                    <div className="p-6 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/50 rounded-[2rem] space-y-4">
                        <div>
                            <p className="text-[10px] font-black uppercase text-blue-600 mb-2 ml-1 tracking-widest">Premenné leadu:</p>
                            <div className="flex flex-wrap gap-2">
                                {leadVariables.map(v => (
                                    <button 
                                        key={v.value} 
                                        type="button"
                                        onClick={() => insertVariable(v.value)}
                                        className="bg-white dark:bg-slate-900 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 text-[11px] font-black text-blue-800 dark:text-blue-400 transition-all active:scale-95 shadow-sm"
                                    >
                                        {v.label} <span className="opacity-50 font-medium ml-1">{v.value}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        <div>
                            <p className="text-[10px] font-black uppercase text-orange-600 mb-2 ml-1 tracking-widest">Dynamický odosielateľ (SmartLead):</p>
                            <div className="flex flex-wrap gap-2">
                                {senderVariables.map(v => (
                                    <button 
                                        key={v.value} 
                                        type="button"
                                        onClick={() => insertVariable(v.value)}
                                        className="bg-white dark:bg-slate-900 hover:bg-orange-600 hover:text-white px-3 py-1.5 rounded-xl border border-orange-200 dark:border-orange-800 text-[11px] font-black text-orange-800 dark:text-orange-400 transition-all active:scale-95 shadow-sm"
                                    >
                                        {v.label} <span className="opacity-50 font-medium ml-1">{v.value}</span>
                                    </button>
                                ))}
                            </div>
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

                {/* RIGHT: LIVE PREVIEW (GMAIL STYLE) */}
                <div className="lg:sticky lg:top-8 space-y-6 lg:min-w-[600px] xl:min-w-[700px]">
                    
                    {/* Gmail-style Container */}
                    <div className="bg-white text-gray-900 rounded-xl shadow-2xl overflow-hidden border border-gray-200 font-sans">
                        {/* Status Bar */}
                        <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-400" />
                                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                                <div className="w-3 h-3 rounded-full bg-green-400" />
                            </div>
                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Gmail Preview</span>
                        </div>
                        
                        <div className="p-6 md:p-8 space-y-6">
                            
                            {/* Email Header */}
                            <div className="space-y-1 pb-4 border-b border-gray-100">
                                <h1 className="text-xl md:text-2xl font-normal text-gray-900">
                                    {replaceVariables(formData.subject) || <span className="text-gray-300 italic">Predmet správy...</span>}
                                </h1>
                                <div className="flex items-center gap-2 mt-4">
                                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                                        You
                                    </div>
                                    <div className="flex flex-col text-sm">
                                        <div className="font-bold text-gray-900 flex items-center gap-1">
                                            {user?.fullName || "Vaše Meno"} 
                                            <span className="text-gray-500 font-normal">
                                                &lt;{user?.primaryEmailAddress?.emailAddress || "vy@firma.sk"}&gt;
                                            </span>
                                        </div>
                                        <div className="text-gray-500">
                                            to <span className="text-gray-900 font-medium">{sampleLead?.email || "klient@firma.sk"}</span>
                                        </div>
                                    </div>
                                    <div className="ml-auto text-xs text-gray-400">
                                        {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} (0 minutes ago)
                                    </div>
                                </div>
                            </div>

                            {/* Email Body */}
                            <div className="text-[15px] leading-relaxed text-gray-800 whitespace-pre-wrap min-h-[200px] font-sans">
                                {replaceVariables(formData.body) || <span className="text-gray-300 italic">Tu sa zobrazí text Vášho emailu...</span>}
                            </div>

                            {/* Follow-up Preview Section */}
                            {formData.followup_body && (
                                <div className="mt-12 pt-8 border-t border-gray-100 relative">
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-xs font-bold text-gray-400 uppercase tracking-widest border border-gray-100 rounded-full py-1">
                                        + {formData.followup_days} dní
                                    </div>
                                    
                                    <div className="opacity-70 bg-gray-50/50 p-6 rounded-lg border border-dashed border-gray-200">
                                        <div className="flex items-center gap-2 mb-4 border-b border-gray-200 pb-2">
                                            <div className="font-bold text-sm text-gray-700">Re: {replaceVariables(formData.subject) || "Predmet..."}</div>
                                            <div className="ml-auto text-xs text-orange-500 font-bold uppercase tracking-wider">Follow-up</div>
                                        </div>
                                        <div className="text-sm leading-relaxed text-gray-600 whitespace-pre-wrap">
                                            {replaceVariables(formData.followup_body)}
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>

                    {/* Variable Data Card */}
                    {sampleLead ? (
                        <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-lg border border-slate-800">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <RefreshCw className="w-4 h-4 text-blue-400" />
                                    <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                                        Dáta z: <span className="text-white">{selectedList || "Neznámy zoznam"}</span>
                                    </span>
                                </div>
                                <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded">ID: {sampleLead.id}</span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div>
                                    <p className="text-[9px] font-black uppercase text-slate-500 mb-0.5">Meno</p>
                                    <p className="text-xs font-bold truncate">{sampleLead.title || sampleLead.keyword || "-"}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black uppercase text-slate-500 mb-0.5">Firma</p>
                                    <p className="text-xs font-bold truncate">{sampleLead.company_name_reworked || "-"}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black uppercase text-slate-500 mb-0.5">Web</p>
                                    <p className="text-xs font-bold truncate text-blue-400">{sampleLead.website || "-"}</p>
                                </div>
                                <div className="col-span-1">
                                    <p className="text-[9px] font-black uppercase text-slate-500 mb-0.5">Oslovenie</p>
                                    <p className="text-xs font-bold truncate text-orange-400">
                                        {(sampleLead.ai_first_sentence || "Dobrý deň").split('\n')[0]}
                                    </p>
                                </div>
                                <div className="col-span-3">
                                    <p className="text-[9px] font-black uppercase text-slate-500 mb-0.5">AI Intro (Celé)</p>
                                    <p className="text-xs font-medium text-slate-300 line-clamp-2 italic">
                                        &quot;{sampleLead.ai_first_sentence || "Zatiaľ nevygenerované..."}&quot;
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                         <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 flex items-center gap-3">
                            <User className="w-5 h-5 text-yellow-600" />
                            <p className="text-sm text-yellow-800 font-medium">Pre tento zoznam nebol nájdený žiadny kontakt na ukážku.</p>
                         </div>
                    )}
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
