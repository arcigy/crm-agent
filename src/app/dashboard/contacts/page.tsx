import { Suspense } from "react";
import { ContactsTable } from "@/components/dashboard/ContactsTable";
import { createContact, getContacts } from "@/app/actions/contacts";
import { Lead } from "@/types/contact";
import { getProjects } from "@/app/actions/projects";
import directus from "@/lib/directus";
import { readItems } from "@directus/sdk";
import {
  ContactActionButtons,
  EmptyStateActions,
} from "@/components/dashboard/ContactActionButtons";
import { ErrorState } from "@/components/dashboard/ErrorState";

export const dynamic = "force-dynamic";

async function ContactsListing() {
  let contacts: Lead[] = [];
  let errorMsg = null;
  let isBlackBox = false;

  try {
    const withTimeout = (promise: Promise<any>, timeoutMs: number) =>
      Promise.race([
        promise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Database Timeout")), timeoutMs),
        ),
      ]);

    // Parallel fetch for speed
    const [projectsRes, contactsRes] = await Promise.allSettled([
      withTimeout(getProjects(), 3000),
      withTimeout(getContacts(), 3000),
    ]);

    const projectsData =
      projectsRes.status === "fulfilled" ? projectsRes.value.data || [] : [];
    const contactsResult =
      contactsRes.status === "fulfilled" ? contactsRes.value : null;

    if (contactsResult && contactsResult.success && contactsResult.data) {
      isBlackBox = true;
      const normalize = (s: string) =>
        (s || "")
          .toString()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .trim()
          .toLowerCase();
      contacts = (contactsResult.data as any[]).map((contact) => {
        const fn = contact.first_name || "";
        const ln = contact.last_name || "";
        const fullName = normalize(`${fn} ${ln}`);
        const contactProjects = ((projectsData as any[]) || []).filter(
          (p: any) => {
            return (
              String(p.contact_id) === String(contact.id) ||
              (p.contact_name && normalize(p.contact_name) === fullName)
            );
          },
        );
        return { ...contact, projects: contactProjects };
      });
    } else if (
      contactsRes.status === "rejected" ||
      (contactsResult && !contactsResult.success)
    ) {
      const reason =
        contactsRes.status === "rejected"
          ? (contactsRes.reason as any)?.message
          : contactsResult?.error;
      console.error("Directus fetch failed:", reason);
      if (reason.includes("Timeout")) {
        errorMsg =
          "Databáza neodpovedá (Timeout). Skontrolujte, či Directus beží na Railway.";
      } else {
        errorMsg = "Chyba spojenia s databázou: " + reason;
      }
    }
  } catch (e: any) {
    console.error("Contacts fetch crash:", e);
    errorMsg = "Nepodarilo sa načítať hub: " + e.message;
  }

  if (errorMsg) return <ErrorState errorMsg={errorMsg} />;

  return (
    <div className="h-full bg-card rounded-t-[4rem] shadow-xl border-x border-t border-border overflow-hidden ring-1 ring-black/5 relative transition-colors">
      <ContactsTable data={contacts} onCreate={createContact} />
    </div>
  );
}

function ContactLoader() {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-card rounded-[4rem] border border-border shadow-sm">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] animate-pulse">
        Syncing with Directus Cloud...
      </p>
    </div>
  );
}

export default function ContactsPage() {
  return (
    <div className="space-y-6 h-screen flex flex-col pt-6 bg-background transition-colors duration-300">
      {/* TOP HEADER SECTION */}
      <div className="flex items-center justify-between px-8 mb-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tighter text-foreground uppercase italic leading-none underline decoration-blue-500 decoration-8 underline-offset-12">
              Agent / <span className="text-blue-600">Kontakty</span>
            </h1>
          </div>
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.3em] pl-1 opacity-60">
            Intelligence & Contact Hub
          </p>
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
          <span className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>{" "}
            SYSTEM_CORE: ONLINE
          </span>
          <span className="opacity-40">
            DB: {process.env.NEXT_PUBLIC_DIRECTUS_URL || "DEFAULT"}
          </span>
        </div>
        <div className="flex items-center gap-4 opacity-40 italic">
          <span className="hidden sm:inline">DIRECTUS_ENGINE: v11.3.1</span>
        </div>
      </div>
    </div>
  );
}
