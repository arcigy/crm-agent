import { ProjectsTable } from '@/components/dashboard/ProjectsTable';
import { getProjects } from '@/app/actions/projects';
import directus from '@/lib/directus';
import { readItems } from '@directus/sdk';
import type { Project, ProjectStage } from '@/types/project';
import { Lead } from '@/types/contact';

import { MOCK_PROJECTS, MOCK_CONTACTS } from '@/types/mockData';

export default async function ProjectsPage() {
    let projects: Project[] = MOCK_PROJECTS;
    let contacts: Lead[] = MOCK_CONTACTS;
    let usingMockData = true;

    // Pokúsiť sa načítať skutočné dáta z databázy
    try {
        const { data, error } = await getProjects();
        if (!error && data && data.length > 0) {
            let realProjects = data;
            usingMockData = false;

            // Načítať kontakty z Directus
            try {
                // @ts-ignore
                const rawContacts = await directus.request(readItems('contacts'));
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
                            contact_name: contact ? `${contact.first_name || contact.firstName} ${contact.last_name || contact.lastName}` : 'Neznámy kontakt'
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
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-black tracking-tight text-gray-900">Projekty</h1>
                    {usingMockData && (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full uppercase tracking-wider">
                            Demo dáta
                        </span>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                <ProjectsTable data={projects} contacts={contacts} />
            </div>
        </div>
    );
}
