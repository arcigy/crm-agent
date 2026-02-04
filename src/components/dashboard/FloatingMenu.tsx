"use client";

import * as React from "react";
import { 
  X, 
  Menu,
  LayoutDashboard,
  Mail,
  Users,
  Briefcase,
  FolderKanban,
  Calendar,
  CheckSquare,
  FileText,
  HardDrive,
  Receipt,
  BrainCircuit,
  History,
  Settings,
  Zap
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import { LogoutButton } from "./LogoutButton";
import { useUser } from "@clerk/nextjs";

export const menuItems = [
  { name: "Nástenka", href: "/dashboard", icon: LayoutDashboard },
  { name: "Doručená pošta", href: "/dashboard/leads", icon: Mail },
  { name: "Kontakty", href: "/dashboard/contacts", icon: Users },
  { name: "Obchody", href: "/dashboard/deals", icon: Briefcase },
  { name: "Projekty", href: "/dashboard/projects", icon: FolderKanban },
  { name: "Kalendár", href: "/dashboard/calendar", icon: Calendar },
  { name: "Úlohy", href: "/dashboard/todo", icon: CheckSquare },
  { name: "Poznámky", href: "/dashboard/notes", icon: FileText },
  { name: "Súbory", href: "/dashboard/files", icon: HardDrive },
  { name: "Fakturácia", href: "/dashboard/invoicing", icon: Receipt },
  { name: "AI Kontext", href: "/dashboard/settings/ai", icon: BrainCircuit },
  { name: "Pamäť AI", href: "/dashboard/settings/memory", icon: History },
  { 
    name: "Cold Outreach", 
    href: "/dashboard/outreach", 
    icon: Zap,
    allowedEmails: ['branislav@arcigy.group']
  },
];

interface FloatingMenuProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onOpen?: () => void;
}

export function FloatingMenu({ isOpen, setIsOpen, onOpen }: FloatingMenuProps) {
  const pathname = usePathname();
  const { user } = useUser();
  const userEmail = user?.primaryEmailAddress?.emailAddress;

  return (
    <div className="fixed top-6 left-6 z-[2000] flex flex-col items-start gap-3">
      {isOpen && (
        <div className="w-[85vw] md:w-[320px] bg-card/90 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden animate-in slide-in-from-top-5 fade-in duration-300 transform-origin-top-left">
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Navigácia</span>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/5 rounded-xl transition-all text-muted-foreground hover:text-white">
                    <X className="w-5 h-5" />
                </button>
            </div>
            <div className="p-3 max-h-[60vh] overflow-y-auto scrollbar-hide py-4 space-y-1 text-left">
                {menuItems
                    .filter(item => !item.allowedEmails || (userEmail && item.allowedEmails.includes(userEmail)))
                    .map((item) => (
                    <Link 
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className={`
                            flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all
                            ${pathname === item.href ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-gray-400 hover:bg-white/5 hover:text-white"}
                        `}
                    >
                        <item.icon className="w-4 h-4" />
                        <span>{item.name}</span>
                    </Link>
                ))}
            </div>
            <div className="p-3 border-t border-white/5 bg-black/20 space-y-1">
                <ThemeToggle />
                <Link
                    href="/dashboard/settings"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-gray-400 hover:bg-white/5 hover:text-white transition-all group"
                >
                    <Settings className="w-4 h-4 group-hover:rotate-45 transition-transform" />
                    <span>Nastavenia</span>
                </Link>
                <LogoutButton className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all" />
            </div>
        </div>
      )}

      <button
          onClick={() => {
              setIsOpen(!isOpen);
              if (!isOpen && onOpen) onOpen();
          }}
          className={`
              w-12 h-12 rounded-2xl shadow-2xl flex items-center justify-center transition-all active:scale-90 group
              ${isOpen ? "bg-slate-900 border border-white/10 text-white" : "bg-card/80 backdrop-blur-xl border border-white/10 text-muted-foreground hover:bg-indigo-600 hover:text-white"}
          `}
          title="Menu"
      >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-6 h-6" />}
      </button>
    </div>
  );
}
