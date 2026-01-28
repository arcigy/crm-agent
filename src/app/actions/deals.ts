"use server";

import directus from "@/lib/directus";
import { readItems, createItem, updateItem } from "@directus/sdk";
import { revalidatePath } from "next/cache";
import { Deal } from "@/types/deal";
import { getProjects } from "./projects";

export async function getDeals(): Promise<{
  data: Deal[] | null;
  error: string | null;
}> {
  try {
    // @ts-ignore
    const deals = await directus.request(
      readItems("deals", {
        filter: { deleted_at: { _null: true } },
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
    // @ts-ignore
    const newDeal = await directus.request(
      createItem("deals", {
        ...data,
        date_created: new Date().toISOString(),
        paid: data.paid || false,
      }),
    );
    revalidatePath("/dashboard/deals");
    return { success: true, data: newDeal };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateDeal(id: number, data: Partial<Deal>) {
  try {
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
    return { success: false, error: e.message };
  }
}

/**
 * Special action to handle invoicing
 */
export async function invoiceDeal(id: number) {
  const today = new Date();
  const dueDate = new Date();
  dueDate.setDate(today.getDate() + 14); // 14 days default

  return updateDeal(id, {
    invoice_date: today.toISOString(),
    due_date: dueDate.toISOString(),
  });
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
