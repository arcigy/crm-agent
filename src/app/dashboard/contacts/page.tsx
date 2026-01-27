import { Suspense } from 'react';
import { ContactsTable } from '@/components/dashboard/ContactsTable';
import { createContact } from '@/app/actions/contacts';
import { Lead } from '@/types/contact';
import { getProjects } from '@/app/actions/projects';
import directus from '@/lib/directus';
import { readItems } from '@directus/sdk';
import { ContactActionButtons, EmptyStateActions } from '@/components/dashboard/ContactActionButtons';
import { ErrorState } from '@/components/dashboard/ErrorState';

export const dynamic = 'force-dynamic';

async function ContactsListing() {
    let contacts: Lead[] = [];
    let errorMsg = null;
    let isBlackBox = false;

    try {
        const withTimeout = (promise: Promise<any>, timeoutMs: number) =>
            Promise.race([
                promise,
                new Promise((_, reject) => setTimeout(() => reject(new Error('Database Timeout')), timeoutMs))
            ]);

        // Parallel fetch for speed
        const [projectsRes, contactsRes] = await Promise.allSettled([
            withTimeout(getProjects(), 3000),
            // @ts-ignore
            withTimeout(directus.request(readItems('contacts', { limit: 100 })), 3000)
        ]);

        const projectsData = projectsRes.status === 'fulfilled' ? (projectsRes.value.data || []) : [];
        const rawItems = contactsRes.status === 'fulfilled' ? contactsRes.value : null;

        if (rawItems) {
            isBlackBox = true;
            const normalize = (s: string) => (s || '').toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
            contacts = (rawItems as any[]).map(contact => {
                const fn = contact.first_name || '';
                const ln = contact.last_name || '';
                const fullName = normalize(`${fn} ${ln}`);
                const contactProjects = (projectsData || []).filter(p => {
                    return String(p.contact_id) === String(contact.id) || (p.contact_name && normalize(p.contact_name) === fullName);
                });
                return { ...contact, projects: contactProjects };
            });
        } else if (contactsRes.status === 'rejected') {
            const reason = (contactsRes.reason as any)?.message || '';
            console.error('Directus fetch failed:', reason);
            if (reason.includes('Timeout')) {
                errorMsg = 'Databáza neodpovedá (Timeout). Skontrolujte, či Directus beží na Railway.';
            } else {
                errorMsg = 'Chyba spojenia s databázou: ' + reason;
            }
        }

    } catch (e: any) {
        console.error('Contacts fetch crash:', e);
        errorMsg = 'Nepodarilo sa načítať hub: ' + e.message;
    }

    if (errorMsg) return <ErrorState errorMsg={errorMsg} />;

    if (contacts.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-white rounded-[4rem] border border-gray-100 p-24 text-center shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600"></div>
                <div className="w-24 h-24 bg-gray-50 rounded-3xl flex items-center justify-center mb-8 border border-white relative z-10 transition-all group-hover:bg-blue-600 shadow-sm">
                    <svg className="w-12 h-12 text-gray-300 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                </div>
                <h3 className="text-3xl font-black text-gray-900 mb-4 uppercase italic tracking-tight">V databáze nie sú žiadne kontakty</h3>
                <p className="text-gray-400 max-w-sm mb-12 text-[10px] font-black uppercase tracking-[0.2em] leading-relaxed">Agenti sú v pohotovosti. Načítajte dáta manuálne alebo cez synchronizáciu.</p>
                <EmptyStateActions />
            </div>
        );
    }

    return (
        <div className="h-full bg-white rounded-t-[4rem] shadow-xl border-x border-t border-gray-100 overflow-hidden ring-1 ring-black/5 relative">
            <ContactsTable data={contacts} onCreate={createContact} />
        </div>
    );
}

function ContactLoader() {
    return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-white rounded-[4rem] border border-gray-100 shadow-sm">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] animate-pulse">Syncing with Directus Cloud...</p>
        </div>
    );
}

export default function ContactsPage() {
    return (
        <div className="space-y-6 h-screen flex flex-col pt-6 bg-[#fcfcfd]">
            {/* TOP HEADER SECTION */}
            <div className="flex items-center justify-between px-8 mb-4">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-black tracking-tighter text-gray-900 uppercase italic leading-none underline decoration-blue-500 decoration-8 underline-offset-12">
                            Agent / <span className="text-blue-600">Kontakty</span>
                        </h1>
                    </div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.3em] pl-1 opacity-60">Intelligence & Contact Hub</p>
                </div>

                <div className="flex items-center gap-4">
                    <ContactActionButtons />
                </div>
            </div>

            <div className="flex-1 overflow-hidden px-8 pb-4">
                <Suspense fallback={<ContactLoader />}>
                    <ContactsListing />
                </Suspense>
            </div>

            {/* Quick Stats Footer */}
            <div className="px-10 pb-4 flex items-center justify-between text-[9px] font-black uppercase tracking-[0.4em] text-gray-400">
                <div className="flex items-center gap-8">
                    <span className="flex items-center gap-3"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div> SYSTEM_CORE: ONLINE</span>
                    <span className="opacity-40">DB: {process.env.NEXT_PUBLIC_DIRECTUS_URL || 'DEFAULT'}</span>
                </div>
                <div className="flex items-center gap-4 opacity-40 italic">
                    <span className="hidden sm:inline">DIRECTUS_ENGINE: v11.3.1</span>
                </div>
            </div>
        </div>
    );
}
