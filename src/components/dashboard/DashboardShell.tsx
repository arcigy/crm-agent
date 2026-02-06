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
  const sidebarRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  // Close menu when clicking outside
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

  return (
    <div className="flex h-screen w-full bg-[#fdfdfd] dark:bg-[#070708] overflow-hidden transition-colors duration-500 relative font-sans">
      {!completed && onboardingScene}

      {/* Fancy Background Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Subtle Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" 
          style={{ 
            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
            backgroundSize: '32px 32px'
          }} 
        />
        
        {/* Soft Radial Glows */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-[120px]" />
      </div>

      {/* Persistent Hamburger Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className={`
          fixed top-6 left-6 z-[2100] w-12 h-12 rounded-2xl shadow-2xl flex items-center justify-center transition-all duration-300 active:scale-90 group
          ${isMenuOpen 
            ? "bg-zinc-900 border border-white/10 text-white hover:bg-zinc-800" 
            : "bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-white/5 text-zinc-500 hover:bg-indigo-600 hover:text-white hover:shadow-indigo-600/30"}
        `}
        title="Menu"
      >
        <Menu className={`w-6 h-6 transition-all duration-300 ${isMenuOpen ? "rotate-90 text-indigo-400" : "group-hover:text-white"}`} />
      </button>

      {/* Full Height Sidebar Menu */}
      <aside 
        ref={sidebarRef}
        className={`
          fixed inset-y-0 left-0 z-[2000] w-64 bg-white/90 dark:bg-[#050409]/95 backdrop-blur-2xl border-r border-zinc-200 dark:border-white/5 shadow-[20px_0_50px_rgba(0,0,0,0.1)] dark:shadow-[20px_0_50px_rgba(0,0,0,0.4)] flex flex-col transition-transform duration-300 ease-out
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
                onClick={() => {
                  if (pathname === item.href) setIsMenuOpen(false);
                }}
                className={`
                  flex items-center gap-4 px-5 py-3.5 rounded-xl text-base font-medium tracking-wide transition-all duration-300 group
                  ${pathname === item.href 
                    ? "bg-zinc-900 dark:bg-zinc-800 text-white shadow-lg shadow-black/10 border border-white/5" 
                    : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-100"
                  }
                `}
              >
                <item.icon className={`w-5 h-5 transition-opacity duration-300 ${pathname === item.href ? "opacity-100 text-indigo-400" : "opacity-50 group-hover:opacity-100 group-hover:text-indigo-300"}`} />
                <span>{item.name}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-zinc-200 dark:border-white/5 bg-zinc-50/50 dark:bg-black/20 space-y-1">
          <ThemeToggle />
          <Link
            href="/dashboard/settings"
            onClick={() => {
              if (pathname === '/dashboard/settings') setIsMenuOpen(false);
            }}
            className="flex items-center gap-4 rounded-xl px-5 py-3.5 text-base font-medium tracking-wide text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all group"
          >
            <Settings className="w-5 h-5 opacity-50 group-hover:rotate-45 transition-transform" />
            <span>Nastavenia</span>
          </Link>
          <LogoutButton className="flex items-center gap-4 rounded-xl px-5 py-3.5 text-base font-medium tracking-wide text-zinc-500 dark:text-zinc-400 hover:bg-red-500/5 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-all" />
        </div>
      </aside>

      {/* Main Content Area */}
      <main 
        className={`
          flex-1 min-w-0 h-full overflow-y-auto bg-transparent relative z-10 transition-all duration-300 ease-out
          ${isMenuOpen ? "ml-64 opacity-50 pointer-events-none md:opacity-100 md:pointer-events-auto" : "ml-0"}
        `}
      >
        <div className="p-4 md:p-8 pt-24 md:pt-8 pl-24 md:pl-28 transition-all">{children}</div>
      </main>

      <FloatingAgentChat isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
    </div>
  );
}
