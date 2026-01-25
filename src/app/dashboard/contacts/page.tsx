import { createClient } from '@/lib/supabase-server';
import { ContactsTable } from '@/components/dashboard/ContactsTable';
import { createContact } from '@/app/actions/contacts';
import { Lead } from '@/types/contact';
import { getProjects } from '@/app/actions/projects';
import directus from '@/lib/directus';
import { readItems } from '@directus/sdk';

export default async function ContactsPage() {
    let contacts: Lead[] = [];
    let errorMsg = null;

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) throw new Error('Not authenticated');

        // Fetch projects from Supabase
        let { data: projectsData } = await getProjects();

        // Fetch contacts from DIRECTUS
        try {
            // @ts-ignore
            const rawItems = await directus.request(readItems('contacts'));
            if (rawItems && rawItems.length > 0) {
                const normalize = (s: string) => (s || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

                contacts = (rawItems as any[]).map(contact => {
                    const fName = contact.first_name || '';
                    const lName = contact.last_name || '';
                    const fullName = normalize(`${fName} ${lName}`);

                    const contactProjects = (projectsData || [])?.filter(p => {
                        const idMatch = String(p.contact_id) === String(contact.id);
                        const projectContactName = normalize(p.contact_name || '');
                        const nameMatch = projectContactName !== '' && projectContactName === fullName;
                        return idMatch || nameMatch;
                    });

                    return { ...contact, projects: contactProjects };
                });
            }
        } catch (directusError: any) {
            console.warn('Directus fetch failed, using Supabase fallback:', directusError.message);

            // Fallback to Supabase
            const { data: sbContacts } = await supabase
                .from('contacts')
                .select('*')
                .or(`owner_id.eq.${user.id},owner_id.is.null`);

            if (sbContacts) {
                const normalize = (s: string) => (s || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
                contacts = (sbContacts as any[]).map(contact => {
                    const fName = contact.first_name || '';
                    const lName = contact.last_name || '';
                    const fullName = normalize(`${fName} ${lName}`);
                    const contactProjects = (projectsData || [])?.filter(p => {
                        const idMatch = String(p.contact_id) === String(contact.id);
                        const nameMatch = normalize(p.contact_name || '') === fullName;
                        return idMatch || nameMatch;
                    });
                    return { ...contact, projects: contactProjects };
                });
            }
        }

    } catch (e: any) {
        console.error('Contacts page error:', e);
        errorMsg = e.message;
    }

    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Contacts Management</h1>
                    <span className="text-gray-400 text-sm mt-1">Real-time sync</span>
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                {errorMsg ? (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
                        <strong className="font-bold">Error!</strong>
                        <span className="block sm:inline"> {errorMsg}</span>
                    </div>
                ) : contacts.length === 0 ? (
                    <div className="bg-white shadow rounded-lg p-10 text-center text-gray-500">
                        <p className="text-lg">No contacts found in CRM.</p>
                    </div>
                ) : (
                    <ContactsTable
                        data={contacts}
                        onCreate={createContact}
                    />
                )}
            </div>
        </div>
    );
}
