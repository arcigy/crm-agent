"use server";

import directus, { getDirectusErrorMessage } from "@/lib/directus";
import { readItems, createItem, updateItem, readItem } from "@directus/sdk";
import { revalidatePath } from "next/cache";
import { Deal } from "@/types/deal";
import { getUserEmail, getAuthorizedEmails, isTeamMember } from "@/lib/auth";

export async function getDeals(): Promise<{
  data: Deal[] | null;
  error: string | null;
}> {
  try {
    const authEmails = await getAuthorizedEmails();
    if (authEmails.length === 0) throw new Error("Unauthorized");

    // @ts-ignore
    const deals = await directus.request(
      readItems("deals", {
        filter: {
          _and: [
            { deleted_at: { _null: true } }, 
            { user_email: { _in: authEmails } }
          ],
        },
        sort: ["-date_created"],
      }),
    );
    return { data: deals as Deal[], error: null };
  } catch (e: any) {
    console.error("Fetch deals failed:", e);
    return { data: [], error: e.message };
  }
}

export async function createDeal(data: Partial<Deal>) {
  try {
    const email = await getUserEmail();
    if (!email) throw new Error("Unauthorized");

    // @ts-ignore
    const newDeal = await directus.request(
      createItem("deals", {
        ...data,
        user_email: email,
        date_created: new Date().toISOString(),
        paid: data.paid || false,
      }),
    );
    revalidatePath("/dashboard/deals");
    return { 
        success: true, 
        data: {
            id: newDeal.id,
            name: newDeal.name,
            user_email: newDeal.user_email
        }
    };
  } catch (e: any) {
    console.error("Create deal failed:", e);
    return { success: false, error: getDirectusErrorMessage(e) };
  }
}

export async function updateDeal(id: number, data: Partial<Deal>, expectedDateUpdated?: string) {
  try {
    const email = await getUserEmail();
    if (!email) throw new Error("Unauthorized");

    // Verify ownership and check optimistic lock
    const current = (await directus.request(readItem("deals", id))) as any;
    if (!isTeamMember(current.user_email)) throw new Error("Access denied");

    // Optimistic locking check
    if (expectedDateUpdated && current.date_updated !== expectedDateUpdated) {
        return { 
            success: false, 
            error: "CONFLICT",
            message: "Tento obchod bol medzitým upravený iným používateľom. Prosím, obnovte stránku." 
        };
    }

    // @ts-ignore
    await directus.request(
      updateItem("deals", id, {
        ...data,
        date_updated: new Date().toISOString(),
      }),
    );
    revalidatePath("/dashboard/deals");
    revalidatePath("/dashboard/projects");
    return { success: true };
  } catch (e: any) {
    console.error("Update deal failed:", e);
    return { success: false, error: getDirectusErrorMessage(e) };
  }
}

/**
 * Special action to handle invoicing with atomic sequence number
 */
export async function invoiceDeal(id: number, expectedDateUpdated?: string) {
  const today = new Date();
  const dueDate = new Date();
  dueDate.setDate(today.getDate() + 14); // 14 days default

  try {
    const { db } = await import("@/lib/db");
    const result = await db.query("SELECT nextval('invoice_number_seq') as num");
    const invoiceNumber = result.rows[0].num;

    return updateDeal(id, {
      invoice_date: today.toISOString(),
      due_date: dueDate.toISOString(),
      // @ts-ignore
      invoice_number: invoiceNumber,
      status: "invoiced"
    }, expectedDateUpdated);
  } catch (error) {
    console.error("Invoicing failed:", error);
    // Fallback if sequence fails
    return updateDeal(id, {
        invoice_date: today.toISOString(),
        due_date: dueDate.toISOString(),
        status: "invoiced"
    }, expectedDateUpdated);
  }
}

export async function togglePaid(id: number, currentStatus: boolean) {
  return updateDeal(id, { paid: !currentStatus });
}

export async function createDealFromProject(
  projectId: number,
  name: string,
  contactId: number,
  value: number,
) {
  return createDeal({
    project_id: projectId,
    name,
    contact_id: contactId,
    value,
    paid: false,
  });
}
