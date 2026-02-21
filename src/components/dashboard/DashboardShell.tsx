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
  ChevronRight,
  Zap,
  MapPin,
  Bot
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import { LogoutButton } from "./LogoutButton";
import { useCurrentCRMUser } from "@/hooks/useCurrentCRMUser";
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
  {
    title: "Vlastné",
    items: [
      { name: "Cold Outreach", href: "/dashboard/outreach", icon: Zap },
      { name: "Maps Scraper", href: "/dashboard/outreach/google-maps", icon: MapPin },
      { name: "Agent AI", href: "/dashboard/agent", icon: Bot },
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
  const { user } = useCurrentCRMUser();
  const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase();

  // Auto-close on navigation
  React.useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

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

      {/* Persistent Animated Hamburger Button */}
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="fixed top-6 left-6 z-[2500] w-12 h-12 rounded-2xl shadow-xl flex items-center justify-center transition-all active:scale-95 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-white/10 text-zinc-600 dark:text-zinc-400 group overflow-hidden"
      >
        <div className="relative w-6 h-6 flex flex-col justify-center items-center gap-1.5">
          <span className={`w-6 h-0.5 bg-current rounded-full transition-all duration-300 ${isMenuOpen ? 'rotate-45 translate-y-2 translate-x-0' : ''}`} />
          <span className={`w-6 h-0.5 bg-current rounded-full transition-all duration-300 ${isMenuOpen ? 'opacity-0 -translate-x-full' : ''}`} />
          <span className={`w-6 h-0.5 bg-current rounded-full transition-all duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-2 translate-x-0' : ''}`} />
        </div>
      </button>

      {/* Backdrop / Overlay */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-md z-[1900] transition-all duration-500 animate-in fade-in" 
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-[2000] bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl border-r border-white/10 flex flex-col transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1)
          ${isMenuOpen ? "w-80 translate-x-0 shadow-[20px_0_60px_rgba(0,0,0,0.2)]" : "w-80 -translate-x-full"}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header (Clean version - no logo, no chevron) */}
          <div className="p-8 flex items-center justify-between">
             <span className="text-xs font-black uppercase tracking-[0.4em] text-zinc-400 opacity-40 italic">Menu</span>
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
                        className={`
                          flex items-center gap-4 px-5 py-4 rounded-[1.5rem] text-sm font-bold transition-all relative group
                          ${isActive 
                            ? "bg-indigo-600 text-white shadow-2xl shadow-indigo-600/30 scale-[1.02]" 
                            : "text-zinc-500 dark:text-zinc-400 hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 hover:translate-x-1"}
                        `}
                      >
                        <item.icon size={20} className={isActive ? "animate-pulse" : ""} />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="p-6 border-t border-white/5 space-y-3">
            <ThemeToggle />
            <Link
              href="/dashboard/settings"
              className={`flex items-center gap-4 px-5 py-4 rounded-[1.5rem] text-sm font-bold text-zinc-500 hover:bg-indigo-500/10 hover:text-indigo-600 transition-all hover:translate-x-1`}
            >
              <Settings size={20} />
              <span>Nastavenia</span>
            </Link>
            <LogoutButton className={`flex items-center gap-4 px-5 py-4 rounded-[1.5rem] text-sm font-bold text-zinc-500 hover:text-red-500 hover:bg-red-500/10 transition-all hover:translate-x-1`} />
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
