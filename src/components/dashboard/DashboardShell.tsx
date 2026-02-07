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
  BrainCircuit,
  History,
  Bot,
  X
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
  { name: "AI Kontext", href: "/dashboard/settings/ai", icon: BrainCircuit },
  { name: "Pamäť AI", href: "/dashboard/settings/memory", icon: History },
  { name: "ArciGy Agent", href: "/dashboard/agent", icon: Bot },
];

export function DashboardShell({ children, completed, onboardingScene }: { children: React.ReactNode, completed: boolean, onboardingScene: React.ReactNode }) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const { user } = useUser();
  const userEmail = user?.primaryEmailAddress?.emailAddress;
  const sidebarRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isMenuOpen && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  return (
    <div className="flex h-screen w-full bg-[#fdfdfd] dark:bg-[#070708] overflow-hidden">
      {!completed && onboardingScene}

      {/* Sidebar Toggle Button */}
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="fixed top-4 left-4 z-[2100] p-3 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-200 dark:border-white/5 text-zinc-500 hover:text-indigo-600 transition-all active:scale-95 md:hidden"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Sidebar Overlay */}
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
          fixed inset-y-0 left-0 z-[2000] w-64 bg-white dark:bg-[#09090b] border-r border-zinc-200 dark:border-white/5 flex flex-col transition-all duration-300 ease-out shadow-2xl md:shadow-none
          ${isMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
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

        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto scrollbar-hide">
          {menuItems
            .filter(item => !item.allowedEmails || (userEmail && item.allowedEmails.includes(userEmail)))
            .map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  onClick={() => setIsMenuOpen(false)}
                  className={`
                    flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group
                    ${isActive 
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" 
                      : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-zinc-100"
                    }
                  `}
                >
                  <item.icon className={`w-5 h-5 transition-colors ${isActive ? "text-white" : "text-zinc-400 group-hover:text-indigo-500"}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
        </nav>

        <div className="p-4 border-t border-zinc-200 dark:border-white/5 bg-zinc-50/50 dark:bg-black/20 space-y-2">
          <LogoutButton className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50/50 dark:hover:bg-red-500/10 transition-colors" />
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
        </div>
      </aside>

      {/* Main Content Area */}
      <main 
        className={`
          flex-1 min-w-0 h-full overflow-y-auto bg-transparent relative z-10 transition-all duration-300 ease-out
          ${isMenuOpen ? "ml-64 opacity-50 pointer-events-none md:opacity-100 md:pointer-events-auto" : "ml-0 md:ml-64"}
        `}
      >
        <div className="p-4 md:p-8 pt-20 md:pt-8 transition-all h-full">
          <div className="max-w-[1600px] mx-auto">
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
