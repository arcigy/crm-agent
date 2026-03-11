import { checkOnboardingStatus } from "@/app/actions/onboarding";
import { OnboardingScene } from "@/components/dashboard/OnboardingScene";
import { ContactPreviewProvider } from "@/components/providers/ContactPreviewProvider";
import { ProjectPreviewProvider } from "@/components/providers/ProjectPreviewProvider";
import { NotePreviewProvider } from "@/components/providers/NotePreviewProvider";
import '../marble.css';
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { completed } = await checkOnboardingStatus();

  return (
    <div className="marble-bg">
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
    </div>
  );
}
