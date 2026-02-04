import { checkOnboardingStatus } from "@/app/actions/onboarding";
import { OnboardingScene } from "@/components/dashboard/OnboardingScene";
import { ContactPreviewProvider } from "@/components/providers/ContactPreviewProvider";
import { ProjectPreviewProvider } from "@/components/providers/ProjectPreviewProvider";
import { FloatingAgentChat } from "@/components/dashboard/FloatingAgentChat";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let completed = true;
  try {
    const status = await checkOnboardingStatus();
    completed = !!status.completed;
  } catch (err) {
    console.error("[Layout] Critical error in checkOnboardingStatus:", err);
  }

  return (
    <ContactPreviewProvider>
      <ProjectPreviewProvider>
        <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-950 overflow-hidden transition-colors duration-300">
          {!completed && <OnboardingScene />}
          <main className="flex-1 min-w-0 h-full overflow-y-auto bg-background transition-colors duration-300">
            <div className="p-4 md:p-8">{children}</div>
          </main>
          <FloatingAgentChat />
        </div>
      </ProjectPreviewProvider>
    </ContactPreviewProvider>
  );
}
