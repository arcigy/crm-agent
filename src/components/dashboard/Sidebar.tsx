"use client";

import * as React from "react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FolderKanban,
  Calendar,
  FileText,
  Settings,
  Mail,
  CheckSquare,
  HardDrive,
  Menu,
  X,
  Receipt,
  BrainCircuit,
  History,
  Bot,
  Terminal,
} from "lucide-react";
import { LogoutButton } from "./LogoutButton";
import { ThemeToggle } from "./ThemeToggle";
import { useUser } from "@clerk/nextjs";

const navigation = [
  { name: "ArciGy Agent", href: "/dashboard/agent", icon: Bot },
  { name: "Nástroje Agentov", href: "/dashboard/tools", icon: Terminal },
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
];

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useUser();
  const [logoError, setLogoError] = useState(false);

  // Custom logo URL - will fallback to default if doesn't exist
  const logoUrl = user ? `/logos/${user.id}_logo.png` : null;

  return (
    <>
      {/* Mobile Toggle Button (only visible on mobile) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed bottom-6 left-6 z-[1100] w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center active:scale-95 transition-all"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Backdrop (mobile only) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] lg:hidden"
          onClick={() => {
            setIsOpen(false);
          }}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`
                fixed inset-y-0 left-0 z-[1050] w-64 flex flex-col bg-[#0F172A] text-white border-r border-[#1E293B]
                transition-transform duration-300 ease-in-out lg:translate-x-0 lg:relative lg:flex-shrink-0
                ${isOpen ? "translate-x-0" : "-translate-x-full"}
                ${className}
            `}
      >
        {/* Logo Area */}
        <div className="flex h-16 shrink-0 items-center px-6 border-b border-[#1E293B]">
          <div className="flex items-center gap-3 font-bold text-xl tracking-tight">
            {!logoError && logoUrl ? (
              <div className="relative w-8 h-8">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="w-full h-full object-contain rounded-lg shadow-lg"
                  onError={() => setLogoError(true)}
                />
              </div>
            ) : (
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/20">
                <span className="text-white">C</span>
              </div>
            )}
            <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent truncate max-w-[140px]">
              {(user as any)?.organization?.name ||
                user?.fullName?.split(" ")[0] ||
                "CRM"}
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-1 scrollbar-hide">
          {navigation.map((item) => {
            // Support sub-paths by checking startWith if necessary, but exact match for now
            const isActive =
              pathname === item.href || pathname?.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                prefetch={true}
                className={`
                                    group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all duration-200 w-full relative z-10
                                    ${
                                      isActive
                                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                                        : "text-gray-400 hover:bg-[#1E293B] hover:text-white"
                                    }
                                `}
              >
                {Icon && (
                  <Icon
                    className={`h-5 w-5 shrink-0 transition-colors ${isActive ? "text-white" : "text-gray-500 group-hover:text-white"}`}
                  />
                )}
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="border-t border-[#1E293B] p-4 bg-[#0F172A] mt-auto">
          <div className="flex flex-col gap-2">
            <ThemeToggle />
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-gray-400 hover:bg-[#1E293B] hover:text-white w-full transition-all group text-left"
            >
              <Settings className="h-5 w-5 text-gray-400 group-hover:rotate-45 transition-transform" />
              Nastavenia
            </Link>
            <LogoutButton className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-gray-400 hover:bg-red-500/10 hover:text-red-400 w-full transition-all justify-start" />
          </div>
        </div>
      </aside>
    </>
  );
}
