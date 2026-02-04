"use client";

import * as React from "react";
import { 
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
import { FloatingAgentChat } from "./FloatingAgentChat";

const menuItems = [
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

export function DashboardShell({ children, completed, onboardingScene }: { children: React.ReactNode, completed: boolean, onboardingScene: React.ReactNode }) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const { user } = useUser();
  const userEmail = user?.primaryEmailAddress?.emailAddress;

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-950 overflow-hidden transition-colors duration-300 relative">
      {!completed && onboardingScene}

      {/* Persistent Hamburger Button */}
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className={`
          fixed top-6 left-6 z-[2100] w-12 h-12 rounded-2xl shadow-2xl flex items-center justify-center transition-all active:scale-90 group
          ${isMenuOpen ? "bg-slate-900 border border-white/10 text-white" : "bg-card/80 backdrop-blur-xl border border-white/10 text-muted-foreground hover:bg-indigo-600 hover:text-white"}
        `}
        title="Menu"
      >
        <Menu className={`w-6 h-6 transition-all duration-300 ${isMenuOpen ? "rotate-90" : ""}`} />
      </button>

      {/* Full Height Sidebar Menu */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-[2000] w-72 bg-card/95 backdrop-blur-2xl border-r border-white/10 shadow-[20px_0_50px_rgba(0,0,0,0.2)] flex flex-col transition-transform duration-500 ease-in-out
          ${isMenuOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="h-20" /> {/* Spacer for top button */}
        <div className="px-8 py-4 border-b border-white/5">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">Navigácia</span>
        </div>
        
        <div className="flex-1 overflow-y-auto scrollbar-hide py-6 px-4 space-y-1.5">
          {menuItems
            .filter(item => !item.allowedEmails || (userEmail && item.allowedEmails.includes(userEmail)))
            .map((item) => (
            <Link 
              key={item.href}
              href={item.href}
              onClick={() => setIsMenuOpen(false)}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all
                ${pathname === item.href ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-gray-400 hover:bg-white/5 hover:text-white"}
              `}
            >
              <item.icon className="w-4 h-4" />
              <span>{item.name}</span>
            </Link>
          ))}
        </div>

        <div className="p-4 border-t border-white/5 bg-black/10 space-y-1.5">
          <ThemeToggle />
          <Link
            href="/dashboard/settings"
            onClick={() => setIsMenuOpen(false)}
            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-gray-400 hover:bg-white/5 hover:text-white transition-all group"
          >
            <Settings className="w-4 h-4 group-hover:rotate-45 transition-transform" />
            <span>Nastavenia</span>
          </Link>
          <LogoutButton className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all" />
        </div>
      </aside>

      {/* Main Content Area */}
      <main 
        className={`
          flex-1 min-w-0 h-full overflow-y-auto bg-background transition-all duration-500 ease-in-out
          ${isMenuOpen ? "ml-72" : "ml-0"}
        `}
      >
        <div className="p-4 md:p-8 pt-24 md:pt-8">{children}</div>
      </main>

      <FloatingAgentChat isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
    </div>
  );
}
