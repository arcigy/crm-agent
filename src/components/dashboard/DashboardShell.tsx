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
  X,
  ChevronRight
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import { LogoutButton } from "./LogoutButton";
import { useUser } from "@clerk/nextjs";
import { FloatingAgentChat } from "./FloatingAgentChat";

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ElementType;
  allowedEmails?: string[];
}

interface MenuSection {
  title: string;
  items: NavigationItem[];
}

const menuGroups: MenuSection[] = [
  {
    title: "CRM",
    items: [
      { name: "Nástenka", href: "/dashboard", icon: LayoutDashboard },
      { name: "Doručená pošta", href: "/dashboard/leads", icon: Mail },
      { name: "Kontakty", href: "/dashboard/contacts", icon: Users },
      { name: "Obchody", href: "/dashboard/deals", icon: Briefcase },
    ],
  },
  {
    title: "Nástroje",
    items: [
      { name: "Projekty", href: "/dashboard/projects", icon: FolderKanban },
      { name: "Kalendár", href: "/dashboard/calendar", icon: Calendar },
      { name: "To-Do", href: "/dashboard/todo", icon: CheckSquare },
      { name: "Poznámky", href: "/dashboard/notes", icon: FileText },
      { name: "Súbory", href: "/dashboard/files", icon: HardDrive },
      { name: "Fakturácia", href: "/dashboard/invoicing", icon: Receipt },
    ],
  },
];

export function DashboardShell({ 
  children, 
  completed, 
  onboardingScene 
}: { 
  children: React.ReactNode,
  completed?: boolean,
  onboardingScene?: React.ReactNode
}) {
  const [isMenuOpen, setIsMenuOpen] = React.useState(true);
  const pathname = usePathname();
  const { user } = useUser();
  const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase();

  const isItemAllowed = (item: NavigationItem) => {
    if (!item.allowedEmails) return true;
    if (!userEmail) return false;
    return item.allowedEmails.some(email => email.toLowerCase() === userEmail);
  };

  return (
    <div className="flex h-[100dvh] w-full bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Persistent Hamburger Button (Mobile) */}
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="fixed top-6 left-6 z-[2100] w-12 h-12 rounded-2xl shadow-2xl flex items-center justify-center transition-all active:scale-95 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-white/10 text-zinc-600 dark:text-zinc-400 md:hidden"
      >
        {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed md:relative inset-y-0 left-0 z-[2000] bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl border-r border-white/10 flex flex-col transition-all duration-300 ease-out
          ${isMenuOpen ? "w-64 translate-x-0" : "w-0 -translate-x-full md:w-20 md:translate-x-0"}
        `}
      >
        <div className={`flex flex-col h-full ${!isMenuOpen && "md:items-center"}`}>
          {/* Header */}
          <div className="p-6 flex items-center justify-between">
            {isMenuOpen ? (
              <span className="text-xl font-black italic tracking-tighter text-indigo-600">ARCIGY.</span>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
                <span className="text-white font-black text-xs">A</span>
              </div>
            )}
            <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors hidden md:block"
            >
                <ChevronRight size={18} className={`text-zinc-400 transition-transform ${isMenuOpen ? "rotate-180" : ""}`} />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-4 py-4 space-y-8 overflow-y-auto scrollbar-hide">
            {menuGroups.map((group) => (
              <div key={group.title} className="space-y-2">
                {isMenuOpen && (
                  <h3 className="px-4 text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500 opacity-50 mb-4">
                    {group.title}
                  </h3>
                )}
                <div className="space-y-1">
                  {group.items.filter(isItemAllowed).map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => window.innerWidth < 768 && setIsMenuOpen(false)}
                        className={`
                          flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all relative group
                          ${isActive 
                            ? "bg-indigo-600 text-white shadow-xl shadow-indigo-600/20" 
                            : "text-zinc-500 dark:text-zinc-400 hover:bg-white/5 hover:text-indigo-600 dark:hover:text-indigo-400"}
                          ${!isMenuOpen && "justify-center px-0 w-12 mx-auto"}
                        `}
                      >
                        <item.icon size={isActive ? 20 : 18} />
                        {isMenuOpen && <span>{item.name}</span>}
                        {!isMenuOpen && (
                          <div className="absolute left-14 px-2 py-1 bg-zinc-900 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                            {item.name}
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-white/5 space-y-2">
            <ThemeToggle />
            <Link
              href="/dashboard/settings"
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-zinc-500 hover:bg-white/5 transition-all ${!isMenuOpen && "justify-center px-0 w-12 mx-auto"}`}
            >
              <Settings size={18} />
              {isMenuOpen && <span>Nastavenia</span>}
            </Link>
            <LogoutButton className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-zinc-500 hover:text-red-500 hover:bg-red-500/10 transition-all ${!isMenuOpen && "justify-center px-0 w-12 mx-auto"}`} />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 h-full overflow-hidden bg-transparent relative z-10 flex flex-col">
          <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 md:py-8 mt-16 md:mt-0">
             <div className="max-w-7xl mx-auto h-full">
                {!completed && onboardingScene ? onboardingScene : children}
             </div>
          </div>
      </main>

      <FloatingAgentChat isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
    </div>
  );
}
