import { getSession } from "@/lib/auth-service";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { VoiceDictationProvider } from "@/components/VoiceDictationProvider";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getSession();

    // Protect the route
    if (!session) {
        redirect("/login");
    }

    return (
        <div className="flex h-screen bg-gray-50/50">
            <Sidebar className="w-64 border-r border-gray-200 hidden md:flex flex-col bg-white" />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <VoiceDictationProvider>
                    {children}
                </VoiceDictationProvider>
            </main>
        </div>
    );
}
