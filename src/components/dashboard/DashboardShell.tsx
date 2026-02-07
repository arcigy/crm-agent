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
  ChevronRight
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import { LogoutButton } from "./LogoutButton";
import { useUser } from "@clerk/nextjs";
import { FloatingAgentChat } from "./FloatingAgentChat";

const menuGroups = [
  {
    title: "Operatíva",
    items: [
      { name: "Nástenka", href: "/dashboard", icon: LayoutDashboard },
      { name: "Doručená pošta", href: "/dashboard/leads", icon: Mail },
      { name: "Kalendár", href: "/dashboard/calendar", icon: Calendar },
      { name: "Úlohy", href: "/dashboard/todo", icon: CheckSquare },
    ]
  },
  {
    title: "Biznis & CRM",
    items: [
      { name: "Kontakty", href: "/dashboard/contacts", icon: Users },
      { name: "Obchody", href: "/dashboard/deals", icon: Briefcase },
      { name: "Projekty", href: "/dashboard/projects", icon: FolderKanban },
      { 
        name: "Cold Outreach", 
        href: "/dashboard/outreach", 
        icon: Zap,
        allowedEmails: ['branislav@arcigy.group']
      },
    ]
  },
  {
    title: "Kancelária",
    items: [
      { name: "Poznámky", href: "/dashboard/notes", icon: FileText },
      { name: "Súbory", href: "/dashboard/files", icon: HardDrive },
      { name: "Fakturácia", href: "/dashboard/invoicing", icon: Receipt },
    ]
  },
  {
    title: "AI Systém",
    items: [
      { name: "AI Kontext", href: "/dashboard/settings/ai", icon: BrainCircuit },
      { name: "Pamäť AI", href: "/dashboard/settings/memory", icon: History },
      { name: "ArciGy Agent", href: "/dashboard/agent", icon: Bot },
    ]
  }
];

export function DashboardShell({ children, completed, onboardingScene }: { children: React.ReactNode, completed: boolean, onboardingScene: React.ReactNode }) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const { user } = useUser();
  const userEmail = user?.primaryEmailAddress?.emailAddress;
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
    <div className="flex h-screen w-full bg-[#fdfdfd] dark:bg-[#070708] overflow-hidden relative font-sans">
      {!completed && onboardingScene}

      {/* Optimized Background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div 
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" 
          style={{ 
            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
            backgroundSize: '32px 32px'
          }} 
        />
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-[120px]" />
      </div>

      <button
        ref={buttonRef}
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className={`
          fixed top-6 left-6 z-[2100] w-12 h-12 rounded-2xl shadow-xl flex items-center justify-center transition-all duration-200 active:scale-90 group will-change-transform
          ${isMenuOpen 
            ? "bg-zinc-900 border border-white/10 text-white hover:bg-zinc-800" 
            : "bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-white/5 text-zinc-500 hover:bg-indigo-600 hover:text-white hover:shadow-indigo-600/30"}
        `}
      >
        <Menu className={`w-6 h-6 transition-all duration-300 ${isMenuOpen ? "rotate-90 scale-75 text-indigo-400" : "group-hover:text-white"}`} />
      </button>

      {/* GPU Sidebar */}
      <aside 
        ref={sidebarRef}
        className={`
          fixed inset-y-0 left-0 z-[2000] w-72 bg-white/95 dark:bg-[#060608]/98 backdrop-blur-3xl border-r border-zinc-200 dark:border-white/5 flex flex-col transition-transform duration-300 cubic-bezier(0.16, 1, 0.3, 1) will-change-transform
          ${isMenuOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="h-16 flex-shrink-0"></div>
        
        <div className="flex-1 flex flex-col py-2 px-4 overflow-y-auto scrollbar-hide">
          <div className="space-y-8">
            {menuGroups.map((group, idx) => (
               <div key={idx} className="space-y-1">
                  <h4 className="px-5 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-50 mb-3 italic">
                    {group.title}
                  </h4>
                  <div className="grid gap-1">
                    {group.items
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
                              flex items-center justify-between px-5 py-3 rounded-2xl text-sm font-black tracking-tight transition-all duration-200 group/nav relative overflow-hidden
                              ${isActive 
                                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 border border-indigo-400/30 scale-[1.02]" 
                                : "text-muted-foreground hover:bg-zinc-100 dark:hover:bg-white/5 hover:text-foreground active:scale-[0.98]"
                              }
                            `}
                          >
                            <div className="flex items-center gap-4 relative z-10">
                              <item.icon className={`w-4.5 h-4.5 transition-all duration-300 ${isActive ? "opacity-100 text-white" : "opacity-40 group-hover/nav:opacity-100 group-hover/nav:text-indigo-400 group-hover/nav:scale-110"}`} />
                              <span className="uppercase italic tracking-tight">{item.name}</span>
                            </div>
                            <ChevronRight className={`w-3.5 h-3.5 transition-all duration-300 ${isActive ? "text-indigo-300 opacity-100" : "opacity-0 -translate-x-2 group-hover/nav:opacity-30 group-hover/nav:translate-x-0"}`} />
                            {!isActive && (
                              <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover/nav:opacity-100 transition-opacity" />
                            )}
                          </Link>
                        );
                      })}
                  </div>
               </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-zinc-200 dark:border-white/5 bg-zinc-50/30 dark:bg-black/20 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/50 dark:bg-white/5 rounded-2xl p-1 border border-black/5 dark:border-white/5 flex items-center justify-center">
              <ThemeToggle />
            </div>
            <Link
              href="/dashboard/settings"
              prefetch={true}
              onClick={() => setIsMenuOpen(false)}
              className="bg-white/50 dark:bg-white/5 rounded-2xl p-3 border border-black/5 dark:border-white/5 flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-white/10 transition-all group"
            >
              <Settings className="w-5 h-5 opacity-40 group-hover:opacity-100 group-hover:rotate-90 transition-all" />
            </Link>
          </div>
          <LogoutButton className="flex items-center justify-center gap-3 rounded-[1.2rem] px-5 py-3.5 text-xs font-black uppercase italic tracking-widest text-muted-foreground hover:bg-red-500/5 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-all border border-transparent hover:border-red-500/20 w-full" />
        </div>
      </aside>

      {/* Main Content - GPU Push */}
      <main 
        className={`
          flex-1 min-w-0 h-full overflow-y-auto bg-transparent relative z-10 transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) will-change-transform
          ${isMenuOpen ? "md:translate-x-72 opacity-40 md:opacity-100" : "translate-x-0"}
        `}
      >
        <div className="p-4 md:p-8 pt-24 md:pt-8 pl-12 md:pl-28 h-full">
          <div className="max-w-[1600px] mx-auto transition-opacity duration-300">
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
