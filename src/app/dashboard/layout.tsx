import { redirect } from "next/navigation";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { checkOnboardingStatus } from "@/app/actions/onboarding";
import { OnboardingScene } from "@/components/dashboard/OnboardingScene";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { completed } = await checkOnboardingStatus();

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-950 overflow-hidden transition-colors duration-300">
      {!completed && <OnboardingScene />}
      <Sidebar />
      <main className="flex-1 min-w-0 h-full overflow-y-auto bg-background transition-colors duration-300">
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
