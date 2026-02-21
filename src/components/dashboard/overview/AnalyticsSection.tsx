"use client";

import { Phone, User, Briefcase, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface AnalyticsSectionProps {
  contacts: any[];
  deals: any[];
  projects: any[];
}

export function AnalyticsSection({ contacts, projects }: AnalyticsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Identify contacts with active or upcoming projects
  const activeStages = ['planning', 'active', 'in_progress'];
  
  const focusData = projects
    .filter(p => activeStages.includes(p.stage))
    .map(p => {
      const contact = contacts.find(c => c.id === p.contact_id);
      return {
        id: p.id,
        projectName: p.name || p.project_type || 'Zákazka',
        contactName: contact ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim() : 'Neznámy kontakt',
        contactId: p.contact_id,
        phone: contact?.phone,
        status: p.stage
      };
    })
    .slice(0, 8); // Top 8 for quick access

  return (
    <div className={`bg-white/70 dark:bg-zinc-900/60 backdrop-blur-2xl px-5 md:px-8 pt-2 md:pt-3 pb-4 md:pb-6 rounded-none md:rounded-[2.5rem] border-b md:border border-blue-500/20 dark:border-blue-500/20 flex flex-col overflow-hidden relative group transition-all duration-300 ${isExpanded ? 'h-full' : 'h-auto md:h-full shadow-sm hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1.5'}`}>
      <div className="absolute -top-6 -left-6 w-24 h-24 bg-blue-500/20 rounded-full blur-[40px] pointer-events-none group-hover:bg-blue-500/30 transition-all duration-300" />
      
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full md:cursor-default relative z-20 cursor-pointer md:cursor-auto mb-2 md:mb-3"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl md:bg-blue-500/10 bg-blue-500/20 flex items-center justify-center border border-blue-500/30 md:border-blue-500/20 shadow-none">
            <Briefcase className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
          </div>
          <div className="flex flex-col items-start text-left">
            <h3 className="text-sm md:text-lg font-black uppercase italic tracking-tighter text-indigo-950 dark:text-indigo-100">Rýchla voľba</h3>
            <span className="text-[7px] text-zinc-500 font-black uppercase tracking-widest md:hidden opacity-60">Kontakty k zákazkám</span>
          </div>
        </div>
        <div className={`w-5 h-5 flex items-center justify-center transition-all duration-300 md:hidden ${isExpanded ? 'rotate-180' : ''}`}>
           <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </div>
      </div>

      <div className={`flex-1 flex flex-col min-h-0 transition-all duration-500 ${isExpanded ? 'opacity-100 block' : 'hidden md:block opacity-0 md:opacity-100'}`}>
        <div className="flex-1 min-h-0 space-y-2.5 overflow-y-auto pr-1 thin-scrollbar relative z-10">
          {focusData.length > 0 ? (
            focusData.map((item, i) => (
              <div 
                key={i} 
                className="bg-white/60 dark:bg-zinc-900/40 p-4 rounded-2xl border border-black/5 dark:border-white/5 backdrop-blur-md flex items-center justify-between group/item hover:border-blue-500/40 transition-all hover:translate-x-1 shadow-none"
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-black text-blue-500 uppercase italic tracking-[0.2em] mb-1">
                    {item.projectName}
                  </span>
                  <Link 
                    href={`/dashboard/contacts?id=${item.contactId?.id || item.contactId}`}
                    className="text-sm font-black text-foreground truncate tracking-tight hover:text-blue-500 transition-colors"
                  >
                    {item.contactName}
                  </Link>
                </div>
                
                {item.phone && (
                  <a 
                    href={`tel:${item.phone}`}
                    className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-500 hover:scale-110 active:scale-95 transition-all shadow-md shadow-blue-600/10 border border-blue-400/30"
                    title={`Volať ${item.contactName}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Phone className="w-4 h-4 fill-current" />
                  </a>
                )}
              </div>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-30 py-10">
              <User className="w-12 h-12 mb-3 text-muted-foreground" />
              <p className="text-[11px] font-black uppercase italic tracking-widest text-muted-foreground">Žiadne aktívne zákazky</p>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/5 flex items-center justify-between relative z-10 font-black italic uppercase text-[10px] text-muted-foreground">
          <span className="tracking-widest opacity-60">Aktívne: {projects.filter(p => activeStages.includes(p.stage)).length}</span>
          <a href="/dashboard/projects" className="text-blue-500 hover:text-blue-400 transition-colors">Všetky projekty →</a>
        </div>
      </div>
    </div>
  );
}
