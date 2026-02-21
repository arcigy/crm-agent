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
  // In development, we skip the blocking check to make page transitions instant
  const completed = process.env.NODE_ENV === "development" ? true : false;
  
  // Real check would happen in a non-blocking way or we can keep it simple for now
  // since the user is in local dev mode.

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
