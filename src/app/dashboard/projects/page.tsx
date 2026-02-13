import { ProjectsTable } from "@/components/dashboard/ProjectsTable";
import { getProjects } from "@/app/actions/projects";
import directus from "@/lib/directus";
import { readItems } from "@directus/sdk";
import type { Project, ProjectStage } from "@/types/project";
import { Lead } from "@/types/contact";
import { ProjectActionButtons } from "@/components/dashboard/ProjectActionButtons";

import { MOCK_PROJECTS, MOCK_CONTACTS } from "@/types/mockData";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  let projects: Project[] = [];
  let contacts: Lead[] = [];

  // Pokúsiť sa načítať skutočné dáta z databázy
  try {
    const withTimeout = (promise: Promise<any>, timeoutMs: number) =>
      Promise.race([
        promise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Request Timeout")), timeoutMs),
        ),
      ]);

    const projectsResult = await withTimeout(getProjects(), 5000).catch(() => ({
      data: [],
      error: "timeout",
    }));

    if (projectsResult.data) {
      const realProjects = projectsResult.data;

      // Načítať kontakty pre tento účet (cez getContacts akciu pre bezpečnosť)
      const { getContacts } = await import("@/app/actions/contacts");
      const contactsRes = await withTimeout(getContacts(), 5000).catch(() => ({ success: false, data: [] }));

      if (contactsRes.success && contactsRes.data) {
        const rawContacts = contactsRes.data;
        
        // Mapovanie kontaktov k projektom
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

        // Obohatiť kontakty o ich projekty
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

        // Obohatiť projekty o mená kontaktov
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
        projects = realProjects;
      }
    }
  } catch (e) {
    console.error("[Projects Hub] Initial load failed:", e);
  }

  return (
    <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col transition-colors duration-300 overflow-hidden">
      <div className="flex items-center justify-between px-8 mb-4 flex-shrink-0">
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

      <div className="flex-1 overflow-hidden px-8 pb-4">
        <ProjectsTable data={projects} contacts={contacts} />
      </div>
    </div>
  );
}
