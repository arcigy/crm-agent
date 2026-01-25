import { createClient } from '@/lib/supabase-server';
import { ContactsTable } from '@/components/dashboard/ContactsTable';
import { createContact } from '@/app/actions/contacts';
import { Lead } from '@/types/contact';
import { getProjects } from '@/app/actions/projects';
import directus from '@/lib/directus';
import { readItems } from '@directus/sdk';
import { ContactActionButtons } from '@/components/dashboard/ContactActionButtons';

export default async function ContactsPage() {
    let contacts: Lead[] = [];
    let errorMsg = null;
    let isBlackBox = false;

    try {
        const supabase = await createClient();

        // 1. Fetch Projects for linking
        let { data: projectsData } = await getProjects();

        // 2. Fetch Contacts from DIRECTUS (Black Box Primary Source)
        try {
            // @ts-ignore
            const rawItems = await directus.request(readItems('contacts'));
            if (rawItems) {
                isBlackBox = true;
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
            console.warn('Directus not yet populated or accessible, trying Supabase fallback...');
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
        errorMsg = 'Error loading CRM data: ' + e.message;
    }

    return (
        <div className="space-y-6 h-screen flex flex-col pt-6 bg-[#fcfcfd]">
            {/* TOP HEADER SECTION */}
            <div className="flex items-center justify-between px-8 mb-4">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-black tracking-tighter text-gray-900 uppercase italic leading-none">
                            Agent / <span className="text-blue-600">Contacts</span>
                        </h1>
                        {isBlackBox && (
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 text-white rounded-full shadow-[0_4px_20px_rgba(37,99,235,0.3)]">
                                <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></div>
                                <span className="text-[10px] font-black uppercase tracking-[0.15em] leading-none">Black Box Active</span>
                            </div>
                        )}
                    </div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-1">Intelligent CRM Database Engine</p>
                </div>

                <div className="flex items-center gap-4">
                    <ContactActionButtons />
                </div>
            </div>

            <div className="flex-1 overflow-hidden px-8 pb-8">
                {errorMsg ? (
                    <div className="h-full flex flex-col items-center justify-center bg-red-50 border-2 border-red-100 rounded-[2.5rem] p-12 text-center shadow-2xl">
                        <div className="w-20 h-20 bg-white shadow-xl rounded-full flex items-center justify-center mb-6 border border-red-50">
                            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 mb-2 uppercase italic tracking-tight">System Alert</h3>
                        <p className="text-red-600 max-w-sm font-medium italic opacity-80">{errorMsg}</p>
                    </div>
                ) : contacts.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center bg-white rounded-[3rem] border border-gray-100 p-24 text-center shadow-[0_40px_100px_rgba(0,0,0,0.02)] relative overflow-hidden group">
                        {/* Background Decoration */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-20"></div>
                        <div className="absolute -right-20 -top-20 w-80 h-80 bg-blue-50 rounded-full blur-[100px] opacity-50 group-hover:opacity-100 transition-opacity duration-700"></div>

                        <div className="w-32 h-32 bg-gray-50 shadow-[0_20px_60px_rgba(0,0,0,0.05)] rounded-[2.5rem] flex items-center justify-center mb-10 border border-white transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 group-hover:bg-blue-600 group-hover:shadow-blue-200">
                            <svg className="w-16 h-16 text-gray-400 group-hover:text-white transition-colors duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                        </div>

                        <h3 className="text-4xl font-black text-gray-900 mb-4 uppercase italic tracking-tighter">Your Database is Empty</h3>
                        <p className="text-gray-400 max-w-md mb-12 text-lg font-bold uppercase tracking-wide opacity-60 leading-tight">Start building your network by adding your first contact or importing from Google.</p>

                        <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
                            <button className="px-10 py-5 bg-gray-900 text-white rounded-2xl font-black uppercase italic tracking-[0.1em] shadow-2xl hover:bg-blue-600 transition-all active:scale-95 flex items-center gap-3">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                                Create Manually
                            </button>
                            <button className="px-10 py-5 bg-white border-4 border-gray-100 text-gray-900 rounded-2xl font-black uppercase italic tracking-[0.1em] shadow-xl hover:border-blue-500 transition-all active:scale-95 flex items-center gap-3">
                                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                Import Data
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="h-full bg-white rounded-t-[3rem] shadow-[0_-30px_100px_rgba(0,0,0,0.04)] border-x border-t border-gray-100 overflow-hidden ring-1 ring-black/5 relative">
                        <ContactsTable
                            data={contacts}
                            onCreate={createContact}
                        />
                    </div>
                )}
            </div>

            {/* Quick Stats Footer */}
            <div className="px-8 pb-4 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                <div className="flex items-center gap-6">
                    <span className="flex items-center gap-2 font-bold"><div className="w-1.5 h-1.5 bg-gray-300 rounded-full"></div> Total Contacts: {contacts.length}</span>
                    <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div> Engine Secure</span>
                </div>
                <span className="opacity-50 italic">Agentic CRM v2.0 - Stable Edition</span>
            </div>
        </div>
    );
}
