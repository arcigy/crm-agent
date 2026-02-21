import { Suspense } from "react";
import { ProjectsTable } from "@/components/dashboard/ProjectsTable";
import { getProjects } from "@/app/actions/projects";
import DashboardLoading from "@/app/dashboard/loading";
import type { Project } from "@/types/project";
import { Lead } from "@/types/contact";
import { ProjectActionButtons } from "@/components/dashboard/ProjectActionButtons";

export const dynamic = "force-dynamic";

async function ProjectsContent() {
  let projects: Project[] = [];
  let contacts: Lead[] = [];

  try {
    const projectsResult = await getProjects();
    const realProjects = projectsResult.data || [];

    if (realProjects.length > 0) {
      const { getContacts } = await import("@/app/actions/contacts");
      const contactsRes = await getContacts();

      if (contactsRes.success && contactsRes.data) {
        const rawContacts = contactsRes.data;
        
        const uniqueContactsMap = new Map();
        (rawContacts as any[]).forEach((contact) => {
          uniqueContactsMap.set(String(contact.id), contact);
        });
        
        const normalize = (s: string) =>
          (s || "")
            .toString()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toLowerCase();

        contacts = Array.from(uniqueContactsMap.values()).map((contact) => {
          const fn = contact.first_name || "";
          const ln = contact.last_name || "";
          const fullName = normalize(`${fn} ${ln}`);

          const contactProjects = (realProjects as any[]).filter((p) => {
            const isIdMatch = String(p.contact_id) === String(contact.id);
            const isNameMatch = p.contact_name && normalize(p.contact_name) === fullName;
            return isIdMatch || isNameMatch;
          });

          return { ...contact, projects: contactProjects };
        });

        projects = (realProjects as any[]).map((p: any) => {
          const contact = contacts.find((c) => String(c.id) === String(p.contact_id));
          return {
            ...p,
            contact_name: contact
              ? `${contact.first_name} ${contact.last_name}`.trim()
              : p.contact_name || "Neznámy",
          };
        });
      } else {
        projects = realProjects as any[];
      }
    }
  } catch (e) {
    console.error("[Projects Hub] Initial load failed:", e);
  }

  return <ProjectsTable data={projects} contacts={contacts} />;
}

export default function ProjectsPage() {
  return (
    <div className="space-y-6 h-full flex flex-col transition-colors duration-300 overflow-hidden">
      <div className="flex items-center justify-between px-2 mb-4 flex-shrink-0">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase italic leading-none">
              Projekty
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ProjectActionButtons />
        </div>
      </div>

      <div className="flex-1 overflow-hidden px-2 pb-4">
        <Suspense fallback={<DashboardLoading />}>
          <ProjectsContent />
        </Suspense>
      </div>
    </div>
  );
}
