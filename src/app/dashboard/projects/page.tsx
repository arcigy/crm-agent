import { ProjectsTable } from '@/components/dashboard/ProjectsTable';
import { getProjects } from '@/app/actions/projects';
import directus from '@/lib/directus';
import { readItems } from '@directus/sdk';
import type { Project, ProjectStage } from '@/types/project';
import { Lead } from '@/types/contact';
import { ProjectActionButtons } from '@/components/dashboard/ProjectActionButtons';

import { MOCK_PROJECTS, MOCK_CONTACTS } from '@/types/mockData';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
    let projects: Project[] = MOCK_PROJECTS;
    let contacts: Lead[] = MOCK_CONTACTS;
    let usingMockData = true;

    // Pokúsiť sa načítať skutočné dáta z databázy
    try {
        const withTimeout = (promise: Promise<any>, timeoutMs: number) =>
            Promise.race([
                promise,
                new Promise((_, reject) => setTimeout(() => reject(new Error('Request Timeout')), timeoutMs))
            ]);

        const projectsResult = await withTimeout(getProjects(), 5000).catch(() => ({ data: [], error: 'timeout' }));
        const { data, error } = projectsResult;

        if (!error && data && data.length > 0) {
            let realProjects = data;
            usingMockData = false;

            // Načítať kontakty z Directus
            try {
                // @ts-ignore
                const rawContacts = await withTimeout(directus.request(readItems('contacts')), 5000).catch(() => []);

                if (rawContacts && rawContacts.length > 0) {
                    const uniqueContactsMap = new Map();
                    (rawContacts as any[]).forEach(contact => {
                        const email = contact.email;
                        if (email && !uniqueContactsMap.has(email)) {
                            uniqueContactsMap.set(email, contact);
                        }
                    });
                    contacts = Array.from(uniqueContactsMap.values());

                    // ENRICH PROJECTS WITH CONTACT NAMES
                    projects = realProjects.map(p => {
                        const contact = contacts.find(c => String(c.id) === String(p.contact_id));
                        return {
                            ...p,
                            contact_name: contact ? `${contact.first_name} ${contact.last_name}` : 'Neznámy kontakt'
                        };
                    });
                } else {
                    projects = realProjects;
                }
            } catch (e) {
                console.log('Enrichment failed, using raw projects');
                projects = realProjects;
            }
        } else {
            console.log('Using mock projects (DB error or empty)');
        }
    } catch (e) {
        console.log('Using mock projects data (Top level error)');
    }

    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
            <div className="flex items-center justify-between px-8 mb-4">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-black tracking-tighter text-gray-900 uppercase italic leading-none underline decoration-indigo-500 decoration-8 underline-offset-12">
                            Agent / <span className="text-indigo-600">Deals & Pipeline</span>
                        </h1>
                    </div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.3em] pl-1 opacity-60">Business Intelligence Hub</p>
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
