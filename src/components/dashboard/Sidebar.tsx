'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    Briefcase,
    Target,
    FolderKanban,
    Calendar,
    FileText, // For Invoicing
    LogOut,
    Settings,
    Mail,
    Smartphone
} from 'lucide-react';
import LogoutButton from './LogoutButton';

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Leads Inbox', href: '/dashboard/leads', icon: Mail },
    { name: 'Contacts', href: '/dashboard/contacts', icon: Users },
    { name: 'Deals', href: '/dashboard/deals', icon: Briefcase },
    { name: 'Projects', href: '/dashboard/projects', icon: FolderKanban },
    { name: 'Calendar', href: '/dashboard/calendar', icon: Calendar },
    { name: 'Invoicing', href: '/dashboard/invoicing', icon: FileText },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="flex h-screen w-64 flex-col fixed inset-y-0 z-50 bg-[#0F172A] text-white border-r border-[#1E293B]">
            {/* Logo Area */}
            <div className="flex h-16 shrink-0 items-center px-6 border-b border-[#1E293B]">
                <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                        <span className="text-white">C</span>
                    </div>
                    <span>CRM-IDE</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`
                group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200
                ${isActive
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'text-gray-400 hover:bg-[#1E293B] hover:text-white'
                                }
              `}
                        >
                            <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-white'}`} />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom Actions */}
            <div className="border-t border-[#1E293B] p-4 bg-[#0F172A]">
                <div className="flex flex-col gap-2">
                    <button className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-400 hover:bg-[#1E293B] hover:text-white w-full transition-colors">
                        <Settings className="h-5 w-5 text-gray-500" />
                        Settings
                    </button>
                    <LogoutButton className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-400 hover:bg-red-500/10 hover:text-red-400 w-full transition-colors justify-start" />
                </div>
            </div>
        </div>
    );
}
