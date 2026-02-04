"use client";

import React, { useState, useEffect } from "react";
import { Zap, MessageSquare, Heart, MinusCircle, AlertCircle, Search, Loader2 } from "lucide-react";
import { getOutreachLeads } from "@/app/actions/outreach";

export default function OutreachResponsesPage() {
  const [replies, setReplies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const refreshReplies = async () => {
    setLoading(true);
    const res = await getOutreachLeads();
    if (res.success) {
      // Filter only those who replied
      setReplies(res.data.filter((l: any) => l.replied || l.reply_content));
    }
    setLoading(false);
  };

  useEffect(() => {
    refreshReplies();
  }, []);

  const getSentimentBadge = (sentiment: string) => {
    switch(sentiment?.toLowerCase()) {
      case 'positive':
        return <span className="flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-black uppercase"><Heart className="w-3 h-3"/> Pozitívna</span>;
      case 'negative':
        return <span className="flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 rounded-full text-[10px] font-black uppercase"><AlertCircle className="w-3 h-3"/> Negatívna</span>;
      default:
        return <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-[10px] font-black uppercase"><MinusCircle className="w-3 h-3"/> Neutrálna</span>;
    }
  };

  const filtered = replies.filter(r => 
    r.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.reply_content?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-purple-600" />
            Odpovede z kampaní
          </h1>
          <p className="text-muted-foreground font-medium">Prehľad všetkých prijatých odpovedí s AI analýzou.</p>
        </div>
        <div className="relative w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search responses..."
              className="w-full pl-11 pr-4 py-3 bg-card border border-border rounded-2xl text-sm outline-none focus:ring-2 focus:ring-purple-600/20 transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-purple-600 opacity-20" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center bg-card border border-border rounded-[3rem] border-dashed">
            <MessageSquare className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-muted-foreground font-bold italic text-lg">Zatiaľ žiadne odpovede na obzore.</p>
          </div>
        ) : (
          filtered.map((reply) => (
            <div key={reply.id} className="bg-card border border-border p-8 rounded-[3rem] shadow-sm hover:shadow-xl transition-all group">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-64 space-y-2">
                    <div className="font-black text-sm truncate">{reply.email}</div>
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{reply.company}</div>
                    <div className="pt-2">
                        {getSentimentBadge(reply.sentiment)}
                    </div>
                </div>
                <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[2rem] border border-border/50 relative">
                    <div className="absolute top-4 right-6 text-[9px] font-bold text-muted-foreground italic">
                        {new Date(reply.last_sent_at || Date.now()).toLocaleDateString('sk-SK')}
                    </div>
                    <div className="text-sm font-medium leading-relaxed whitespace-pre-line text-foreground/80">
                        {reply.reply_content || "Bez textu (iba otvorené/kliknuté)"}
                    </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
