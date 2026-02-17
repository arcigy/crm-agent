import { ContactsTable } from "@/components/dashboard/ContactsTable";
import { getContacts, createContact } from "@/app/actions/contacts";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const res = await getContacts();
  const contacts = res.success ? (res.data as any[]) : [];

  async function handleCreate(data: any) {
    "use server";
    return await createContact(data);
  }

  return (
    <div className="space-y-6 h-[calc(100vh-40px)] flex flex-col">
      {/* Header - Clean "Nástenka" style */}
      <div className="flex items-center justify-between px-2">
        <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase italic leading-none">
          Kontakty
        </h1>
      </div>

      {/* Main Table */}
      <div className="flex-1 overflow-hidden">
        <ContactsTable data={contacts} onCreate={handleCreate} />
      </div>
    </div>
  );
}
