"use client";

import * as React from "react";
import {
  Calendar,
  Clock,
  Coins,
  User,
  ShieldCheck,
  Zap,
  Briefcase,
  Mail,
  PenLine,
  FileText,
  Activity,
} from "lucide-react";

import { Project, PROJECT_STAGES } from "@/types/project";
import { useContactPreview } from "@/components/providers/ContactPreviewProvider";

interface ProjectProfileSidebarProps {
  project: Project;
  onClose: () => void;
  onTabChange?: (tab: "overview" | "tasks" | "documents") => void;
}

export function ProjectProfileSidebar({
  project,
  onClose,
  onTabChange,
}: ProjectProfileSidebarProps) {
  const { openContact } = useContactPreview();
  const stageInfo = PROJECT_STAGES.find((s) => s.value === project.stage);

  const handleContactClick = () => {
    if (project.contact_id) {
      const cid =
        typeof project.contact_id === "object"
          ? (project.contact_id as any).id
          : project.contact_id;
      if (cid) openContact(cid);
    }
  };

  return (
    <div className="w-80 lg:w-96 bg-[#000000] border-r border-white/5 flex flex-col shrink-0 overflow-y-auto thin-scrollbar select-none relative">
      {/* Premium Header Background - Fixed spacing to prevent overlap */}
      <div className="h-64 bg-gradient-to-br from-violet-600/30 via-indigo-950/10 to-transparent relative overflow-hidden flex flex-col justify-end px-10 pt-16 pb-12">
         <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_2px_2px,rgba(255,255,255,0.03)_1px,transparent_0)] bg-[size:32px_32px]" />
         <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-violet-400/60">Názov_Projektu</p>
            </div>
            <h2 className="text-4xl font-black text-white leading-tight uppercase italic tracking-tighter line-clamp-2">
              {project.project_type || project.name}
            </h2>
         </div>
      </div>

      <div className="flex-1 px-8 pt-6 space-y-10">
        {/* Uniform List for Core Intel */}
        <div className="space-y-6">
            <div className="flex items-center gap-4 px-2">
                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-violet-400/60">Informácie</span>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-violet-500/20 to-transparent" />
            </div>

            <div className="space-y-3 px-2">
                {/* Client Row */}
                <ProjectRow 
                    icon={<User />}
                    value={project.contact_name || "Unassigned"}
                    color="text-blue-400"
                    bg="rgba(59,130,246,0.08)"
                    border="border-blue-500/20"
                    glow="rgba(59,130,246,0.5)"
                    onClick={handleContactClick}
                />
                {/* Phase Row */}
                <ProjectRow 
                    icon={<Activity />}
                    value={stageInfo?.label || project.stage}
                    color="text-violet-400"
                    bg="rgba(139,92,246,0.08)"
                    border="border-violet-500/20"
                    glow="rgba(139,92,246,0.5)"
                    isPulse={project.stage === 'in_progress'}
                />
                {/* Valuation Row */}
                <ProjectRow 
                    icon={<Coins />}
                    value={project.value ? `${new Intl.NumberFormat('sk-SK').format(project.value)} €` : "TBD"}
                    color="text-emerald-400"
                    bg="rgba(16,185,129,0.08)"
                    border="border-emerald-500/20"
                    glow="rgba(16,185,129,0.5)"
                />
            </div>
        </div>

        {/* Internal Notes area */}
        <div className="px-2 pt-4 pb-20">
            <div className="flex items-center gap-4 mb-8">
                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-violet-400/60">Poznámka</span>
                <div className="h-[1px] flex-1 bg-white/5" />
            </div>

            <div className="relative group">
                <textarea
                    className="w-full h-36 bg-black/40 border border-white/5 rounded-[2rem] p-6 text-[13px] text-zinc-300 placeholder:text-zinc-800 focus:outline-none focus:border-violet-500/30 transition-all resize-none thin-scrollbar mb-6 font-medium leading-relaxed shadow-inner"
                    placeholder="Input project notes..."
                />
                <button 
                    className="w-full py-4 rounded-[1.2rem] font-black text-[11px] uppercase tracking-[0.4em] transition-all duration-300 relative overflow-hidden active:scale-95 group shadow-[0_0_30px_rgba(139,92,246,0.1)] hover:shadow-[0_0_40px_rgba(139,92,246,0.2)]"
                    style={{ 
                        background: "linear-gradient(135deg, rgba(124,58,237,0.2) 0%, rgba(109,40,217,0.1) 100%)",
                        border: "1.5px solid rgba(167,139,250,0.3)",
                        color: "white"
                    }}
                >
                    <div className="absolute inset-0 bg-violet-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    Uložiť do systému
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}

function ProjectRow({ icon, value, color, bg, border, glow, isPulse, onClick }: any) {
    return (
        <div 
            className={`p-4 rounded-3xl border transition-all duration-500 relative overflow-hidden group ${onClick ? 'cursor-pointer hover:bg-white/[0.04]' : ''}`}
            onClick={onClick}
            style={{ 
                background: bg,
                borderColor: border.split('-')[1] === 'none' ? 'transparent' : 'rgba(255,255,255,0.05)'
            }}
        >
            <div 
                className="absolute -top-10 -right-10 w-24 h-24 blur-[40px] opacity-10 group-hover:opacity-20 transition-opacity duration-700"
                style={{ background: glow }}
            />
            
            <div className="flex items-center gap-5 relative z-10">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 border border-current/20 group-hover:scale-110 ${color}`}
                    style={{ background: 'rgba(255,255,255,0.03)' }}>
                    {React.cloneElement(icon, { className: "w-4.5 h-4.5" })}
                </div>
                
                <div className="flex items-center gap-2 min-w-0">
                    {isPulse && (
                        <div className="relative">
                            <div className="w-1.5 h-1.5 rounded-full bg-current" />
                            <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-current animate-ping opacity-40" />
                        </div>
                    )}
                    <p className={`text-[15px] font-black italic tracking-tighter pr-4 ${color} group-hover:text-white transition-colors`}>
                        {value}
                    </p>
                </div>
            </div>

            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </div>
    );
}
