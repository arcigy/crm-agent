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
  Zap,
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
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const pathname = usePathname();
  const { user } = useUser();
  const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase();

  const isItemAllowed = (item: NavigationItem) => {
    if (!item.allowedEmails) return true;
    if (!userEmail) return false;
    return item.allowedEmails.some(email => email.toLowerCase() === userEmail);
  };

  return (
    <div className="flex h-[100dvh] w-full bg-zinc-50 dark:bg-zinc-950 overflow-hidden relative">
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Persistent Hamburger Button */}
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="fixed top-6 left-6 z-[2100] w-12 h-12 rounded-2xl shadow-lg flex items-center justify-center transition-all active:scale-95 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 md:hidden"
      >
        {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar Overlay (Mobile) */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[2000] md:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:relative inset-y-0 left-0 z-[2000] w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col transition-transform duration-300 ease-out
          ${isMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0 md:w-16"}
        `}
      >
        {/* Sidebar Header/Logo */}
        <div className={`p-6 flex items-center ${isMenuOpen ? "justify-between" : "justify-center"}`}>
          {isMenuOpen ? (
            <span className="text-xl font-black italic tracking-tighter text-indigo-600">ARCIGY.</span>
          ) : (
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center">
              <span className="text-white font-black text-xs">A</span>
            </div>
          )}
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors hidden md:block"
          >
            <ChevronRight size={18} className={`text-zinc-400 transition-transform duration-300 ${isMenuOpen ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 px-3 py-4 space-y-8 overflow-y-auto scrollbar-hide">
          {menuGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              {isMenuOpen && (
                <h3 className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 mb-2">
                  {group.title}
                </h3>
              )}
              {group.items.filter(isItemAllowed).map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`
                      flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all group
                      ${isActive 
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                        : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-indigo-600 dark:hover:text-indigo-400"}
                      ${!isMenuOpen && "justify-center px-2"}
                    `}
                  >
                    <item.icon size={18} className={`${isActive ? "text-white" : "group-hover:scale-110 transition-transform"}`} />
                    {isMenuOpen && <span className="truncate">{item.name}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className={`p-4 border-t border-zinc-200 dark:border-zinc-800 space-y-1 ${!isMenuOpen && "flex flex-col items-center"}`}>
          <div className={`${!isMenuOpen && "mb-2"}`}>
            <ThemeToggle />
          </div>
          <Link
            href="/dashboard/settings"
            className={`
              flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all
              ${!isMenuOpen && "justify-center px-2"}
            `}
          >
            <Settings size={18} />
            {isMenuOpen && <span>Nastavenia</span>}
          </Link>
          <LogoutButton 
            className={`
              flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-zinc-500 dark:text-zinc-400 hover:bg-red-50/50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-400 transition-all
              ${!isMenuOpen && "justify-center px-2"}
            `}
          />
        </div>
      </aside>

      {/* Main Content */}
      <main 
        className={`
          flex-1 min-w-0 h-full overflow-y-auto md:overflow-hidden bg-transparent relative z-10 transition-all duration-300 ease-out
          ${isMenuOpen ? "md:max-w-[calc(100%-16rem)]" : "md:max-w-[calc(100%-4rem)]"}
        `}
      >
        <div className="p-0 md:p-6 transition-all h-full">
          <div className="max-w-full mx-auto h-full flex flex-col">
            {!completed && onboardingScene ? onboardingScene : children}
          </div>
        </div>
      </main>

      <FloatingAgentChat isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
    </div>
  );
}
