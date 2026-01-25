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

        // 1. Fetch Projects for linking
        let { data: projectsData } = await getProjects();

        // 2. Fetch Contacts from DIRECTUS (Primary Source)
        try {
            // @ts-ignore
            const rawItems = await directus.request(readItems('contacts'));
            if (rawItems && (rawItems as any[]).length > 0) {
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
        } catch (err) {
            console.error('Directus fetch failed:', err);
            // Fallback to Supabase if Directus is not yet seeded or fails
            const { data: sbContacts } = await supabase
                .from('contacts')
                .select('*')
                .order('created_at', { ascending: false });

            if (sbContacts) {
                const normalize = (s: string) => (s || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
                contacts = (sbContacts as any[]).map(contact => {
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
        }

    } catch (e: any) {
        console.error('Contacts page error:', e);
        errorMsg = 'Error loading contacts: ' + e.message;
    }

    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col pt-4">
            <div className="flex items-center justify-between px-6 mb-2">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-black tracking-tight text-gray-900 uppercase italic underline decoration-blue-500 decoration-4 underline-offset-8">CRM / Dashboard</h1>
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 rounded-full border border-blue-100 shadow-sm">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="text-[10px] font-bold text-blue-700 uppercase tracking-[0.2em] leading-none">Black Box Active</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden px-6">
                {errorMsg ? (
                    <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-6 py-4 rounded-r-xl shadow-md">
                        <p className="font-bold uppercase text-xs tracking-wider mb-1">System Warning</p>
                        <p className="text-sm italic">{errorMsg}</p>
                    </div>
                ) : contacts.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-white rounded-[2rem] border-2 border-dashed border-gray-200 p-12 text-center transition-all duration-500 hover:border-blue-300 group">
                        <div className="w-24 h-24 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[2rem] flex items-center justify-center mb-8 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
                            <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 mb-2 italic">Database Empty</h3>
                        <p className="text-gray-500 max-w-sm mb-10 text-sm leading-relaxed tracking-tight font-medium uppercase opacity-60">Ready for synchronization. Import via Google, vCard or add manually.</p>
                    </div>
                ) : (
                    <div className="h-full bg-white rounded-t-[2.5rem] shadow-[0_-20px_80px_rgba(0,0,0,0.03)] border-x border-t border-gray-100 overflow-hidden ring-1 ring-black/5">
                        <ContactsTable
                            data={contacts}
                            onCreate={createContact}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
