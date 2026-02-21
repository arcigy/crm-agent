import { Suspense } from "react";
import { ContactsTable } from "@/components/dashboard/ContactsTable";
import { getContacts, createContact } from "@/app/actions/contacts";
import DashboardLoading from "@/app/dashboard/loading";

export const dynamic = "force-dynamic";

async function ContactsContent() {
  const res = await getContacts();
  const contacts = res.success ? (res.data as any[]) : [];

  async function handleCreate(data: any) {
    "use server";
    return await createContact(data);
  }

  return (
    <div className="flex-1 overflow-hidden">
      <ContactsTable data={contacts} onCreate={handleCreate} />
    </div>
  );
}

export default function ContactsPage() {
  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header - Clean "Nástenka" style */}
      <div className="flex items-center justify-between px-2">
        <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase italic leading-none">
          Kontakty
        </h1>
      </div>

      <Suspense fallback={<DashboardLoading />}>
        <ContactsContent />
      </Suspense>
    </div>
  );
}
