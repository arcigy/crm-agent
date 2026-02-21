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
import { usePathname, useRouter } from "next/navigation";
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
  const [isNavigating, setIsNavigating] = React.useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useCurrentCRMUser();
  const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase();

  // Auto-close on navigation
  React.useEffect(() => {
    setIsMenuOpen(false);
    setIsNavigating(false);
  }, [pathname]);

  const handleLinkClick = (href: string) => {
    if (href !== pathname) {
      setIsNavigating(true);
      setIsMenuOpen(false);
    }
  };

  const isItemAllowed = (item: NavigationItem) => {
    if (!item.allowedEmails) return true;
    if (!userEmail) return false;
    return item.allowedEmails.some(email => email.toLowerCase() === userEmail);
  };

  return (
    <div className="flex h-[100dvh] w-full bg-slate-50 dark:bg-black overflow-hidden relative">
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes loading-bar {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0); }
          100% { transform: translateX(100%); }
        }
      `}</style>

      {/* Top Loading Bar */}
      {isNavigating && (
        <div className="fixed top-0 left-0 right-0 h-1 z-[3000] overflow-hidden">
          <div className="h-full bg-indigo-600 animate-[loading-bar_0.8s_infinite_linear]" style={{ width: '40%' }} />
        </div>
      )}

      {/* ── Fixed Top Bar (hamburger + page identity) ── */}
      {!isMenuOpen && (
        <div className="fixed top-0 left-0 right-0 z-[2500] h-14 flex items-center px-4 pointer-events-none">
          <button
            onClick={() => setIsMenuOpen(true)}
            className="pointer-events-auto w-10 h-10 rounded-2xl shadow-lg flex items-center justify-center transition-all active:scale-95 bg-white/90 dark:bg-black border border-black/10 dark:border-white/10 text-zinc-600 dark:text-zinc-400 animate-in fade-in duration-300"
          >
            <Menu size={18} />
          </button>
        </div>
      )}

      {/* Backdrop / Overlay */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-[1900] transition-opacity duration-300 animate-in fade-in" 
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-[2000] bg-white/95 dark:bg-zinc-950 border-r border-white/10 flex flex-col transition-transform duration-200 ease-out will-change-transform
          ${isMenuOpen ? "w-80 translate-x-0 shadow-[20px_0_60px_rgba(0,0,0,0.2)]" : "w-80 -translate-x-full"}
        `}
      >
        <div className="flex flex-col h-full overflow-hidden relative">
          {/* Closing Button - Absolutely positioned to save space */}
          <button 
            onClick={() => setIsMenuOpen(false)}
            className="absolute top-4 right-4 z-[2100] w-10 h-10 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center transition-colors text-zinc-400"
          >
            <X size={20} />
          </button>

          {/* Nav */}
          <nav className="flex-1 px-4 pt-10 pb-2 space-y-6 overflow-y-auto scrollbar-hide">
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
                        onMouseEnter={() => router.prefetch(item.href)}
                        onClick={() => handleLinkClick(item.href)}
                        className={`
                          flex items-center gap-4 px-5 py-4 rounded-[1.5rem] text-sm font-bold transition-all relative group active:scale-95
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

          <div className="p-4 border-t border-white/5 space-y-1">
            <ThemeToggle />
            <Link
              href="/dashboard/settings"
              onMouseEnter={() => router.prefetch('/dashboard/settings')}
              onClick={() => handleLinkClick('/dashboard/settings')}
              className={`flex items-center gap-4 px-5 py-3 rounded-2xl text-sm font-bold text-zinc-500 hover:bg-indigo-500/10 hover:text-indigo-600 transition-all`}
            >
              <Settings size={18} />
              <span>Nastavenia</span>
            </Link>
            <LogoutButton className={`flex items-center gap-4 px-5 py-3 rounded-2xl text-sm font-bold text-zinc-500 hover:text-red-500 hover:bg-red-500/10 transition-all`} />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main 
        className={`flex-1 min-w-0 h-full overflow-hidden bg-transparent relative z-10 flex flex-col transition-all duration-300 ${isNavigating ? "opacity-30 blur-[2px] pointer-events-none" : "opacity-100 blur-0"}`}
      >
          {/* Spacer so content never goes under the fixed top bar */}
          <div className="h-14 flex-shrink-0" />
          <div className="flex-1 min-h-0 overflow-y-auto px-2 md:px-6 pb-4 md:pb-6 scrollbar-hide">
             <div className="w-full h-full">
                {!completed && onboardingScene ? onboardingScene : children}
             </div>
          </div>
      </main>

      <FloatingAgentChat isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
    </div>
  );
}
