"use client";

import * as React from "react";
import {
  Calendar,
  Clock,
  DollarSign,
  User,
  ShieldCheck,
  Zap,
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
  const initials = project.project_type?.[0] || project.name?.[0] || "P";
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
    <div className="w-80 lg:w-96 bg-[#0a0a0c] border-r border-white/5 flex flex-col shrink-0 overflow-y-auto thin-scrollbar select-none relative">
      <div className="h-40 bg-gradient-to-br from-violet-600/20 via-indigo-600/5 to-transparent relative overflow-hidden">
         <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_2px_2px,rgba(255,255,255,0.05)_1px,transparent_0)] bg-[size:24px_24px]" />
      </div>

      <div className="px-8 relative">
        <div className="-mt-16 mb-8 w-32 h-32 rounded-[2.5rem] bg-[#0a0a0c] p-2 shadow-2xl relative group">
          <div 
            className="w-full h-full rounded-[2rem] flex items-center justify-center text-white font-black text-4xl uppercase italic tracking-tighter"
            style={{
                background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
                boxShadow: "0 10px 40px rgba(124,58,237,0.3)"
            }}
          >
            {initials}
          </div>
        </div>

        <div className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-black text-violet-500 uppercase tracking-[0.3em]">Projekt #{project.id}</span>
          </div>
          <h2 className="text-3xl font-black text-white leading-tight mb-6 italic tracking-tighter uppercase whitespace-pre-wrap">
            {project.project_type || project.name}
          </h2>
          
          <div 
            className="inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl border transition-all duration-300"
            style={{
                background: "rgba(139,92,246,0.1)",
                borderColor: "rgba(139,92,246,0.3)",
                color: "#a78bfa"
            }}
          >
            <div className={`w-2 h-2 rounded-full ${project.stage === 'in_progress' ? 'animate-pulse' : ''}`} style={{ background: "#a78bfa", boxShadow: "0 0 10px #a78bfa" }} />
            <span className="text-[11px] font-black uppercase tracking-[0.2em] leading-none">
               {stageInfo?.label || project.stage}
            </span>
          </div>
        </div>

        <div className="space-y-8 mb-10">
          <div className="flex items-center gap-3">
             <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">Informácie</span>
             <div className="h-[1px] flex-1 bg-white/5" />
          </div>
          
          <div className="space-y-2">
            <NeonRow
                icon={<User className="w-4 h-4" />}
                label="Kontakt"
                value={project.contact_name || "Nezadaný"}
                onClick={handleContactClick}
                isActive={!!project.contact_id}
                neonColor="blue"
            />
            <NeonRow
                icon={<DollarSign className="w-4 h-4" />}
                label="Budget"
                value={project.value ? `${new Intl.NumberFormat('sk-SK').format(project.value)} €` : "Dohodou"}
                neonColor="emerald"
            />
            <NeonRow
                icon={<Calendar className="w-4 h-4" />}
                label="Deadline"
                value={
                project.end_date && !isNaN(new Date(project.end_date).getTime())
                    ? new Date(project.end_date).toLocaleDateString("sk-SK")
                    : "Not Set"
                }
                neonColor="violet"
            />
            <NeonRow
                icon={<Clock className="w-4 h-4" />}
                label="Vytvorený"
                value={new Date(project.date_created).toLocaleDateString("sk-SK")}
                neonColor="zinc"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function NeonRow({ icon, label, value, onClick, isActive, neonColor }: any) {
  const colors: any = {
    blue: "text-blue-500 bg-blue-500/10 border-blue-500/20 shadow-blue-500/20",
    emerald: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/20",
    violet: "text-violet-500 bg-violet-500/10 border-violet-500/20 shadow-violet-500/20",
    zinc: "text-zinc-500 bg-zinc-500/10 border-zinc-500/20 shadow-zinc-500/20"
  };

  const selectedColor = colors[neonColor] || colors.zinc;

  return (
    <div 
        className={`flex items-center gap-5 p-4 rounded-2xl group transition-all duration-300 border border-transparent ${onClick ? 'cursor-pointer hover:bg-white/5 hover:border-white/5' : ''}`}
        onClick={onClick}
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 border group-hover:scale-110 ${selectedColor}`}>
        {React.cloneElement(icon, { className: "w-5 h-5" })}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest mb-1 group-hover:text-zinc-400 transition-colors">
          {label}
        </p>
        <p className={`text-sm font-black italic tracking-tight truncate ${isActive ? 'text-violet-400' : 'text-zinc-200'}`}>
          {value}
        </p>
      </div>
    </div>
  );
}
