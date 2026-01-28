import { getSession } from "@/lib/auth-service";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/dashboard/Sidebar";
// VoiceDictationProvider temporarily disabled due to @ffmpeg/ffmpeg module issue
// import { VoiceDictationProvider } from "@/components/VoiceDictationProvider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Relying on Clerk middleware for protection in src/middleware.ts

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-950 overflow-hidden transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 min-w-0 h-full overflow-y-auto bg-background transition-colors duration-300">
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
