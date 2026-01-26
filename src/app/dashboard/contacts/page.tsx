import { ContactsTable } from '@/components/dashboard/ContactsTable';
import { createContact } from '@/app/actions/contacts';
import { Lead } from '@/types/contact';
import { getProjects } from '@/app/actions/projects';
import directus from '@/lib/directus';
import { readItems } from '@directus/sdk';
import { ContactActionButtons, EmptyStateActions } from '@/components/dashboard/ContactActionButtons';
import { ErrorState } from '@/components/dashboard/ErrorState';

export const dynamic = 'force-dynamic';

export default async function ContactsPage() {
    let contacts: Lead[] = [];
    let errorMsg = null;
    let isBlackBox = false;

    try {
        // 1. Fetch Projects for linking
        let { data: projectsData } = await getProjects();

        // 2. Fetch Contacts from DIRECTUS (Primary Source)
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
        } catch (err: any) {
            console.error('Directus interaction failed:', err);
            errorMsg = 'Nepodarilo sa načítať dáta z natívnej databázy: ' + err.message;
        }

    } catch (e: any) {
        console.error('Contacts page error:', e);
        errorMsg = 'Error loading CRM analytics: ' + e.message;
    }

    return (
        <div className="space-y-6 h-screen flex flex-col pt-6 bg-[#fcfcfd]">
            {/* TOP HEADER SECTION */}
            <div className="flex items-center justify-between px-8 mb-4">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-black tracking-tighter text-gray-900 uppercase italic leading-none underline decoration-blue-500 decoration-8 underline-offset-8">
                            Agent / <span className="text-blue-600">Master Box</span>
                        </h1>
                        {isBlackBox && (
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 text-white rounded-full shadow-[0_4px_20px_rgba(37,99,235,0.4)]">
                                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] leading-none">Black Box Active</span>
                            </div>
                        )}
                    </div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.3em] pl-1 opacity-60">Intelligence & Contact Hub</p>
                </div>

                <div className="flex items-center gap-4">
                    <ContactActionButtons />
                </div>
            </div>

            <div className="flex-1 overflow-hidden px-8 pb-8">
                {errorMsg ? (
                    <ErrorState errorMsg={errorMsg} />
                ) : contacts.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center bg-white rounded-[4rem] border border-gray-100 p-24 text-center shadow-[0_50px_150px_rgba(0,0,0,0.02)] relative overflow-hidden group">
                        {/* Background Decoration */}
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600"></div>
                        <div className="absolute -right-20 -top-20 w-[30rem] h-[30rem] bg-blue-50/50 rounded-full blur-[120px] transition-all duration-1000 group-hover:bg-blue-100/50"></div>
                        <div className="absolute -left-24 -bottom-24 w-[25rem] h-[25rem] bg-indigo-50/30 rounded-full blur-[100px]"></div>

                        <div className="w-40 h-40 bg-gray-50 shadow-[0_30px_80px_rgba(0,0,0,0.06)] rounded-[3.5rem] flex items-center justify-center mb-12 border border-white relative z-10 transition-all duration-700 group-hover:scale-110 group-hover:rotate-6 group-hover:bg-blue-600 group-hover:shadow-blue-200 ring-8 ring-gray-50/50">
                            <svg className="w-20 h-20 text-gray-300 group-hover:text-white transition-colors duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                        </div>

                        <h3 className="text-5xl font-black text-gray-900 mb-6 uppercase italic tracking-[calc(-0.05em)] leading-none relative z-10">
                            The Box is <span className="text-blue-600">Empty</span>
                        </h3>
                        <p className="text-gray-400 max-w-md mb-16 text-xs font-black uppercase tracking-[0.4em] opacity-80 leading-relaxed relative z-10">
                            Neural network standby. Create manual entries or synchronize external data sources to begin extraction.
                        </p>

                        <EmptyStateActions />
                    </div>
                ) : (
                    <div className="h-full bg-white rounded-t-[4rem] shadow-[0_-40px_120px_rgba(0,0,0,0.05)] border-x border-t border-gray-100 overflow-hidden ring-1 ring-black/5 relative">
                        <ContactsTable
                            data={contacts}
                            onCreate={createContact}
                        />
                    </div>
                )}
            </div>

            {/* Quick Stats Footer */}
            <div className="px-10 pb-6 flex items-center justify-between text-[9px] font-black uppercase tracking-[0.4em] text-gray-400">
                <div className="flex items-center gap-8">
                    <span className="flex items-center gap-3"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)] animate-pulse"></div> DB_ENTRIES: {contacts.length}</span>
                    <span className="flex items-center gap-3"><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div> SYSTEM_CORE: ONLINE</span>
                </div>
                <div className="flex items-center gap-4 opacity-40 italic">
                    <span>SECURITY_LAYER: AES-256</span>
                    <span className="hidden sm:inline">|</span>
                    <span className="hidden sm:inline">DIRECTUS_ENGINE: v11.3.1</span>
                </div>
            </div>
        </div>
    );
}
