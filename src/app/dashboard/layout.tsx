import { checkOnboardingStatus } from "@/app/actions/onboarding";
import { OnboardingScene } from "@/components/dashboard/OnboardingScene";
import { ContactPreviewProvider } from "@/components/providers/ContactPreviewProvider";
import { ProjectPreviewProvider } from "@/components/providers/ProjectPreviewProvider";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { completed } = await checkOnboardingStatus();

  return (
    <ContactPreviewProvider>
      <ProjectPreviewProvider>
        <DashboardShell 
          completed={completed} 
          onboardingScene={<OnboardingScene />}
        >
          {children}
        </DashboardShell>
      </ProjectPreviewProvider>
    </ContactPreviewProvider>
  );
}
