"use client";

import { useUser } from "@clerk/nextjs";
import { RedirectToSignIn } from "@clerk/nextjs";
import { Zap, Users, Send, MessageCircle, BarChart3, MapPin } from "lucide-react";
import Link from "next/link";
import React from "react";
const allowedEmails = ["branislav@acg.group", "arcigyback@gmail.com", "branislav@arcigy.group", "andrej@arcigy.group"];

export default function OutreachPage() {
  const stats = [
    { name: "Total Leads", value: "0", icon: Users, color: "text-blue-500" },
    { name: "Emails Sent", value: "0", icon: Send, color: "text-green-500" },
    { name: "Replies", value: "0", icon: MessageCircle, color: "text-purple-500" },
    { name: "Conversion", value: "0%", icon: BarChart3, color: "text-orange-500" },
  ];

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
          <Zap className="w-10 h-10 text-blue-600" />
          Cold Outreach Tool
        </h1>
        <p className="text-muted-foreground font-medium">
          Automatizovaný systém pre akvizíciu leadov pomocou AI a sekvencií.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-card border border-border p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 ${stat.color} transition-colors group-hover:scale-110 duration-300`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{stat.name}</p>
                  <p className="text-2xl font-black">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-8">
        <Link href="/dashboard/outreach/google-maps" className="col-span-1 p-8 rounded-[3rem] bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-xl hover:scale-[1.02] transition-all group relative overflow-hidden">
             <div className="relative z-10">
                <MapPin className="w-12 h-12 mb-4 opacity-80 group-hover:scale-110 transition-transform" />
                <h3 className="text-2xl font-black mb-2">Maps Scraper</h3>
                <p className="text-amber-100 text-sm font-medium">Získajte kontakty z Google Maps zadarmo.</p>
             </div>
             <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all"></div>
        </Link>
        <Link href="/dashboard/outreach/leads" className="col-span-1 p-8 rounded-[3rem] bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-xl hover:scale-[1.02] transition-all group relative overflow-hidden">
             <div className="relative z-10">
                <Users className="w-12 h-12 mb-4 opacity-80 group-hover:scale-110 transition-transform" />
                <h3 className="text-2xl font-black mb-2">Správa Leadov</h3>
                <p className="text-blue-100 text-sm font-medium">Nahrajte CSV a pripravte si zoznam pre kampaň.</p>
             </div>
             <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all"></div>
        </Link>

        <Link href="/dashboard/outreach/campaigns" className="col-span-1 p-8 rounded-[3rem] bg-card border border-border shadow-xl hover:scale-[1.02] transition-all group relative overflow-hidden">
             <div className="relative z-10">
                <Send className="w-12 h-12 mb-4 text-blue-600 opacity-80 group-hover:scale-110 transition-transform" />
                <h3 className="text-2xl font-black mb-2">Kampane</h3>
                <p className="text-muted-foreground text-sm font-medium">Nastavte si emailové sekvencie a follow-upy.</p>
             </div>
        </Link>

        <Link href="/dashboard/outreach/responses" className="col-span-1 p-8 rounded-[3rem] bg-card border border-border shadow-xl hover:scale-[1.02] transition-all group relative overflow-hidden">
             <div className="relative z-10">
                <MessageCircle className="w-12 h-12 mb-4 text-purple-600 opacity-80 group-hover:scale-110 transition-transform" />
                <h3 className="text-2xl font-black mb-2">Odpovede</h3>
                <p className="text-muted-foreground text-sm font-medium">AI analýza sentimentu a prehľad odpovedí.</p>
             </div>
        </Link>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-8 rounded-[3rem]">
        <h4 className="text-lg font-black mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Aktuálny stav schránok
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(idx => (
                <div key={idx} className="bg-background/50 border border-border/50 p-4 rounded-2xl flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground italic">Inbox #{idx}</span>
                    <span className="text-xs font-black text-red-500 uppercase">Odpojené</span>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}
