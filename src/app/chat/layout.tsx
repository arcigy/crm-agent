import { checkOnboardingStatus } from "@/app/actions/onboarding/status";
import { OnboardingScene } from "@/components/dashboard/OnboardingScene";
import { ContactPreviewProvider } from "@/components/providers/ContactPreviewProvider";
import { ProjectPreviewProvider } from "@/components/providers/ProjectPreviewProvider";
import { NotePreviewProvider } from "@/components/providers/NotePreviewProvider";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const dynamic = "force-dynamic";

import { EmailContextProvider } from "@/components/providers/EmailContextProvider";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { completed } = await checkOnboardingStatus();

  return (
    <EmailContextProvider>
      <ContactPreviewProvider>
        <ProjectPreviewProvider>
          <NotePreviewProvider>
            <DashboardShell 
              completed={completed} 
              onboardingScene={<OnboardingScene />}
            >
              {children}
            </DashboardShell>
          </NotePreviewProvider>
        </ProjectPreviewProvider>
      </ContactPreviewProvider>
    </EmailContextProvider>
  );
}
