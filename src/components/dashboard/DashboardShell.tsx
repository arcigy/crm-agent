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
  icon: any;
  allowedEmails?: string[];
}

interface MenuGroup {
  title: string;
  items: NavigationItem[];
}

const menuGroups: MenuGroup[] = [
  {
    title: "Denný prehľad",
    items: [
      { name: "Nástenka", href: "/dashboard", icon: LayoutDashboard },
      { name: "Kalendár", href: "/dashboard/calendar", icon: Calendar },
      { name: "Úlohy", href: "/dashboard/todo", icon: CheckSquare },
      { name: "Doručená pošta", href: "/dashboard/leads", icon: Mail },
    ]
  },
  {
    title: "CRM & Sales",
    items: [
      { name: "Kontakty", href: "/dashboard/contacts", icon: Users },
      { name: "Obchody", href: "/dashboard/deals", icon: Briefcase },
      { name: "Fakturácia", href: "/dashboard/invoicing", icon: Receipt },
    ]
  },
  {
    title: "Produkcia",
    items: [
      { name: "Projekty", href: "/dashboard/projects", icon: FolderKanban },
      { name: "Poznámky", href: "/dashboard/notes", icon: FileText },
      { name: "Súbory", href: "/dashboard/files", icon: HardDrive },
    ]
  },
  {
    title: "Custom Functions",
    items: [
      { 
        name: "Cold Outreach", 
        href: "/dashboard/outreach", 
        icon: Zap,
        allowedEmails: ['branislav@arcigy.group', 'andrej@arcigy.group', 'arcigyback@gmail.com']
      },
    ]
  }
];

export function DashboardShell({ children, completed, onboardingScene }: { children: React.ReactNode, completed: boolean, onboardingScene: React.ReactNode }) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const { user } = useUser();
  const userEmail = user?.primaryEmailAddress?.emailAddress || (process.env.NODE_ENV === 'development' ? 'arcigyback@gmail.com' : undefined);
  const sidebarRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        isMenuOpen && 
        sidebarRef.current && 
        !sidebarRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  return (
    <div className="flex h-[100dvh] w-full bg-[#fdfdfd] dark:bg-[#070708] overflow-hidden">
      {!completed && onboardingScene}

      {/* Sidebar Toggle Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className={`
          fixed top-4 left-4 z-[2100] p-3 rounded-xl shadow-lg border transition-all active:scale-95 flex items-center justify-center
          ${isMenuOpen 
            ? "bg-zinc-900 border-white/10 text-white" 
            : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-white/5 text-zinc-500 hover:text-indigo-600"}
        `}
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Sidebar Overlay (Mobile only) */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[1900] md:hidden transition-opacity" 
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Sidebar Content */}
      <aside 
        ref={sidebarRef}
        className={`
          fixed inset-y-0 left-0 z-[2000] w-64 bg-white dark:bg-[#09090b] border-r border-zinc-200 dark:border-white/5 flex flex-col transition-transform duration-300 ease-out shadow-2xl
          ${isMenuOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="p-6 flex items-center justify-end">
          <button 
            onClick={() => setIsMenuOpen(false)}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-lg transition-colors md:hidden"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <nav className="flex-1 px-4 flex flex-col justify-start py-4 gap-6 overflow-y-auto scrollbar-hide">
          {menuGroups.map((group) => (
            <div key={group.title} className="space-y-2">
              <h3 className="px-6 text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400/70 dark:text-indigo-500/50 mb-4 font-black">
                {group.title}
              </h3>
              <div className="space-y-1">
                {group.items
                  .filter((item) => {
                    if (!item.allowedEmails) return true;
                    const currentEmail = userEmail?.toLowerCase();
                    return (
                      currentEmail &&
                      item.allowedEmails.some(
                        (e) => e.toLowerCase() === currentEmail,
                      )
                    );
                  })
                  .map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        prefetch={true}
                        onClick={() => setIsMenuOpen(false)}
                        className={`
                          flex items-center justify-between px-6 py-3.5 rounded-2xl text-[13px] font-bold transition-all duration-200 group
                          ${
                            isActive
                              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-[1.02]"
                              : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-zinc-100 active:scale-95"
                          }
                        `}
                      >
                        <div className="flex items-center gap-4">
                          <item.icon
                            className={`w-5 h-5 transition-colors ${isActive ? "text-white" : "text-zinc-400 group-hover:text-indigo-500"}`}
                          />
                          <span className="tracking-tight">{item.name}</span>
                        </div>
                        <ChevronRight
                          className={`w-4 h-4 transition-all opacity-0 group-hover:opacity-40 ${isActive ? "hidden" : "block"}`}
                        />
                      </Link>
                    );
                  })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-200 dark:border-white/5 bg-zinc-50/50 dark:bg-black/20 space-y-3">
          <div className="flex items-center justify-between px-2">
            <ThemeToggle />
            <Link
              href="/dashboard/settings"
              prefetch={true}
              onClick={() => setIsMenuOpen(false)}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-lg transition-colors group"
            >
              <Settings className="w-5 h-5 text-muted-foreground group-hover:rotate-45 transition-transform" />
            </Link>
          </div>
          <LogoutButton className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50/50 dark:hover:bg-red-500/10 transition-colors" />
        </div>
      </aside>

      <main 
        className={`
          flex-1 min-w-0 h-full overflow-y-auto md:overflow-hidden bg-transparent relative z-10 transition-all duration-300 ease-out
          ${isMenuOpen ? "md:pl-64" : "pl-16"}
        `}
      >
        <div className="p-5 md:p-4 pt-16 md:pt-4 transition-all pb-20">
          <div className="max-w-full mx-auto w-full">
             {children}
          </div>
        </div>
      </main>

      <FloatingAgentChat isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
