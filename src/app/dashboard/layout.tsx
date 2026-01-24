import { Sidebar } from '@/components/dashboard/Sidebar';
import { AIChatWidget } from '@/components/AIChatWidget';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen bg-[#F1F5F9]">
            <Sidebar />
            {/* Main Content Area */}
            <main className="flex-1 overflow-hidden ml-64 relative">
                {children}
                <AIChatWidget />
            </main>
        </div>
    );
}
