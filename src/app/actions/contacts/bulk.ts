"use server";

import { revalidatePath } from "next/cache";
import directus, { getDirectusErrorMessage } from "@/lib/directus";
import { createItem, readItems, updateItem, readItem } from "@directus/sdk";
import { getUserEmail } from "@/lib/auth";
import { ContactItem } from "@/types/contact";
import { syncContactToGoogle } from "../google-contacts";

export async function bulkCreateContacts(contacts: Record<string, unknown>[]) {
  try {
    const userEmail = await getUserEmail();
    if (!userEmail) throw new Error("Unauthorized");

    let successCount = 0;
    const existingContacts = await directus.request(
      readItems("contacts", {
        filter: { user_email: { _eq: userEmail } },
        fields: ["email"] as string[],
        limit: -1,
      }),
    );
    const existingEmails = new Set(
      (existingContacts as unknown as ContactItem[])
        .map((c) => c.email?.toLowerCase())
        .filter(Boolean),
    );

    for (const contact of contacts) {
      const normalizedEmail = ((contact.email as string) || "").toLowerCase().trim();
      if (normalizedEmail && existingEmails.has(normalizedEmail)) continue;

      try {
        await directus.request(
          createItem("contacts", {
            first_name: (contact.first_name as string) || "Neznámy",
            last_name: (contact.last_name as string) || "",
            email: (contact.email as string) || "",
            phone: ((contact.phone as string) || "").replace(/\s/g, ""),
            company: (contact.company as string) || "",
            status: (contact.status as string) || "lead",
            user_email: userEmail,
          }),
        );
        successCount++;
        if (normalizedEmail) existingEmails.add(normalizedEmail);
      } catch (e) {
        console.error("Bulk item failed", e);
      }
    }
    revalidatePath("/dashboard/contacts");
    return { success: true, count: successCount };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function bulkUpdateContacts(ids: (string | number)[], data: Partial<ContactItem>) {
  try {
    const userEmail = await getUserEmail();
    if (!userEmail) throw new Error("Unauthorized");

    for (const id of ids) {
      const current = (await directus.request(readItem("contacts", id))) as Record<string, unknown>;
      if (current.user_email === userEmail) {
        await directus.request(updateItem("contacts", id, data));
        syncContactToGoogle(id).catch(err => console.error(`Sync failed for ${id}:`, err));
      }
    }
    revalidatePath("/dashboard/contacts");
    return { success: true };
  } catch (error) {
    return { success: false, error: getDirectusErrorMessage(error) };
  }
}

export async function bulkDeleteContacts(ids: (string | number)[]) {
  return bulkUpdateContacts(ids, {
    status: "archived",
    deleted_at: new Date().toISOString()
  } as Partial<ContactItem>);
}
