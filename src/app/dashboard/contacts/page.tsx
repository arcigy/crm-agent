import { createClient } from '@/lib/supabase-server';
import { ContactsTable } from '@/components/dashboard/ContactsTable';
import { createContact } from '@/app/actions/contacts';
import { Lead } from '@/types/contact';
import { getProjects } from '@/app/actions/projects';

export default async function ContactsPage() {
    let contacts: Lead[] = [];
    let errorMsg = null;

    try {
        const supabase = await createClient();

        // 1. Načítame projekty pre prepojenie s kontaktmi
        let { data: projectsData } = await getProjects();

        // 2. Načítame VŠETKY kontakty priamo zo Supabase (naša hlavná DB)
        // Odstraňujeme filter na owner_id, aby ste videli aj staršie importy (ako Peter Svoboda)
        const { data: rawContacts, error: contactsError } = await supabase
            .from('contacts')
            .select('*')
            .order('created_at', { ascending: false });

        if (contactsError) throw contactsError;

        if (rawContacts) {
            const normalize = (s: string) => (s || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

            contacts = (rawContacts as any[]).map(contact => {
                const fName = contact.first_name || '';
                const lName = contact.last_name || '';
                const fullName = normalize(`${fName} ${lName}`);

                // Priradíme projekty ku kontaktom podľa mena alebo ID
                const contactProjects = (projectsData || [])?.filter(p => {
                    const idMatch = String(p.contact_id) === String(contact.id);
                    const projectContactName = normalize(p.contact_name || '');
                    const nameMatch = projectContactName !== '' && projectContactName === fullName;
                    return idMatch || nameMatch;
                });

                return {
                    ...contact,
                    projects: contactProjects
                };
            });
        }

    } catch (e: any) {
        console.error('CRM Error:', e);
        errorMsg = 'Interná chyba CRM: ' + e.message;
    }

    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col pt-4">
            <div className="flex items-center justify-between px-6 mb-2">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-black tracking-tight text-gray-900 uppercase italic">CRM / Kontakty</h1>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 rounded-md border border-green-100">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-[10px] font-bold text-green-700 uppercase tracking-widest leading-none">Powered by Supabase</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden px-6">
                {errorMsg ? (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex flex-col gap-2">
                        <strong className="font-bold border-b border-red-200 pb-1 uppercase text-xs">Upozornenie systému</strong>
                        <span className="text-sm italic"> {errorMsg}</span>
                    </div>
                ) : contacts.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-200 p-12 text-center">
                        <div className="w-20 h-20 bg-white shadow-xl rounded-full flex items-center justify-center mb-6 border border-gray-100">
                            <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Vaša databáza je prázdna</h3>
                        <p className="text-gray-500 max-w-sm mb-8 italic">Importujte kontakty cez Google, vCard alebo ich pridajte manuálne.</p>
                    </div>
                ) : (
                    <div className="h-full bg-white rounded-t-3xl shadow-2xl shadow-gray-100 border-x border-t border-gray-100 overflow-hidden">
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
