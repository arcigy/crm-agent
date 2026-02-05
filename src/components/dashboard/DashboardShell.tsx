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
          fixed top-6 left-6 z-[2100] w-12 h-12 rounded-2xl shadow-2xl flex items-center justify-center transition-all duration-300 active:scale-90 group
          ${isMenuOpen 
            ? "bg-slate-900 border border-white/10 text-white hover:bg-slate-800 hover:shadow-indigo-500/20" 
            : "bg-card/80 backdrop-blur-xl border border-white/10 text-muted-foreground hover:bg-indigo-600 hover:text-white hover:shadow-indigo-600/30"}
        `}
        title="Menu"
      >
        <Menu className={`w-6 h-6 transition-all duration-300 ${isMenuOpen ? "rotate-90 text-indigo-400" : "group-hover:text-white"}`} />
      </button>

      {/* Full Height Sidebar Menu */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-[2000] w-64 bg-[#050409]/95 backdrop-blur-2xl border-r border-white/5 shadow-[20px_0_50px_rgba(0,0,0,0.4)] flex flex-col transition-transform duration-500 ease-in-out font-sans
          ${isMenuOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="h-24" /> {/* Spacer for top button */}
        
        <div className="flex-1 flex flex-col justify-center py-2 px-3 overflow-y-auto scrollbar-hide">
          <div className="flex flex-col gap-0.5">
            {menuItems
              .filter(item => !item.allowedEmails || (userEmail && item.allowedEmails.includes(userEmail)))
              .map((item) => (
              <Link 
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium tracking-wide transition-all duration-300 group
                  ${pathname === item.href 
                    ? "bg-zinc-800/80 text-white shadow-md shadow-black/10 border border-white/5" 
                    : "text-zinc-500 hover:bg-zinc-800/40 hover:text-zinc-200"
                  }
                `}
              >
                <item.icon className={`w-4 h-4 transition-opacity duration-300 ${pathname === item.href ? "opacity-100 text-indigo-400" : "opacity-60 group-hover:opacity-100 group-hover:text-indigo-300"}`} />
                <span>{item.name}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-white/5 bg-black/20 space-y-1">
          <ThemeToggle />
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium tracking-wide text-zinc-500 hover:bg-zinc-800/40 hover:text-zinc-200 transition-all group"
          >
            <Settings className="w-4 h-4 opacity-60 group-hover:rotate-45 transition-transform" />
            <span>Nastavenia</span>
          </Link>
          <LogoutButton className="flex items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium tracking-wide text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition-all" />
        </div>
      </aside>

      {/* Main Content Area */}
      <main 
        className={`
          flex-1 min-w-0 h-full overflow-y-auto bg-background transition-all duration-500 ease-in-out
          ${isMenuOpen ? "ml-64" : "ml-0"}
        `}
      >
        <div className="p-4 md:p-8 pt-24 md:pt-8 pl-24 md:pl-28 transition-all">{children}</div>
      </main>

      <FloatingAgentChat isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
    </div>
  );
}
