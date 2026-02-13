"use client";

import { Phone, User, Briefcase } from "lucide-react";
import Link from "next/link";

interface AnalyticsSectionProps {
  contacts: any[];
  deals: any[];
  projects: any[];
}

export function AnalyticsSection({ contacts, projects }: AnalyticsSectionProps) {
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
    <div className="bg-indigo-50/30 dark:bg-indigo-950/10 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-indigo-500/10 dark:border-indigo-500/5 flex flex-col h-full overflow-hidden relative group transition-all duration-500">
      {/* 1. Subtle Grid Pattern - Independent Background */}
      <div 
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" 
        style={{ 
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '24px 24px'
        }} 
      />

      {/* 2. Soft Radial Glows */}
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none opacity-50 group-hover:opacity-100 group-hover:bg-blue-500/20 transition-all duration-700" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="flex items-center justify-between mb-6 flex-shrink-0 relative z-10">
        <h3 className="text-xl font-black uppercase italic tracking-tighter">Rýchla voľba (Zákazky)</h3>
        <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-none">
          <Briefcase className="w-5 h-5 text-blue-500" />
        </div>
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto pr-2 scrollbar-hide relative z-10">
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
                  href={`/dashboard/contacts?id=${item.contactId}`}
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
  );
}
