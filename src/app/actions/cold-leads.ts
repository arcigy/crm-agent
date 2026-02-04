"use server";

import { revalidatePath } from "next/cache";
import directus, { getDirectusErrorMessage } from "@/lib/directus";
import { createItem, readItems, deleteItem, updateItem, deleteItems, updateItems } from "@directus/sdk";
import { getUserEmail } from "@/lib/auth";

export interface ColdLeadItem {
  id: string | number;
  title: string;
  company_name_reworked?: string;
  website?: string;
  phone?: string;
  city?: string;
  category?: string;
  abstract?: string;
  ai_first_sentence?: string;
  status?: "new" | "contacted" | "replied" | "rejected";
  list_name?: string;
  user_email?: string;
  date_created?: string;
  date_updated?: string;
}

export interface ColdLeadList {
  id: number;
  name: string;
}

export async function getColdLeads(listName?: string) {
  try {
    const userEmail = await getUserEmail();
    if (!userEmail) throw new Error("Unauthorized");

    const filter: any = {
      user_email: { _eq: userEmail },
    };
    
    // Filter by list name if provided, otherwise default to "Zoznam 1" or handle "all" logic in frontend
    // But backend should filter if param is passed
    if (listName) {
        filter.list_name = { _eq: listName };
    }

    const leads = (await directus.request(
      readItems("cold_leads", {
        filter,
        sort: ["-date_created"] as string[],
        limit: -1,
      }),
    )) as unknown as ColdLeadItem[];

    return { success: true, data: leads };
  } catch (error) {
    console.error("Failed to fetch cold leads:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function getColdLeadLists() {
    try {
        // Assume lists are global or filter by ownership if you added user_email to lists
        // For now fetching all as requested structure was simple
        const lists = await directus.request(readItems("cold_leads_lists", {
            sort: ["id"],
        }));
        return { success: true, data: lists as unknown as ColdLeadList[] };
    } catch (e: any) {
        console.error("Failed to fetch lists:", e);
        return { success: false, error: getDirectusErrorMessage(e) };
    }
}

export async function createColdLeadList(name: string) {
    try {
         await directus.request(createItem("cold_leads_lists", { name }));
         revalidatePath("/dashboard/cold-outreach");
         return { success: true };
    } catch (e: any) {
        console.error("Failed to create list:", e);
        return { success: false, error: getDirectusErrorMessage(e) };
    }
}

export async function bulkCreateColdLeads(leads: Partial<ColdLeadItem>[]) {
  try {
    const userEmail = await getUserEmail();
    if (!userEmail) throw new Error("Unauthorized");

    const formattedLeads = leads.map(l => ({
      ...l,
      user_email: userEmail,
      status: l.status || "new",
      list_name: l.list_name || "Zoznam 1" // Default to Zoznam 1
    }));

    await directus.request(createItem("cold_leads", formattedLeads));
    
    revalidatePath("/dashboard/cold-outreach");
    return { success: true, count: leads.length };
  } catch (e: any) {
    console.error("Bulk create cold leads failed:", e);
    return { success: false, error: getDirectusErrorMessage(e) };
  }
}

export async function deleteColdLead(id: string | number) {
  try {
    const userEmail = await getUserEmail();
    if (!userEmail) throw new Error("Unauthorized");

    await directus.request(deleteItem("cold_leads", id));
    
    revalidatePath("/dashboard/cold-outreach");
    return { success: true };
  } catch (e: any) {
    console.error("Delete cold lead failed:", e);
    return { success: false, error: getDirectusErrorMessage(e) };
  }
}

export async function bulkDeleteColdLeads(ids: (string | number)[]) {
    try {
        const userEmail = await getUserEmail();
        if (!userEmail) throw new Error("Unauthorized");
        
        // deleteItems takes array of keys
        await directus.request(deleteItems("cold_leads", ids));
        
        revalidatePath("/dashboard/cold-outreach");
        return { success: true };
    } catch (e: any) {
        console.error("Bulk delete failed:", e);
        return { success: false, error: getDirectusErrorMessage(e) };
    }
}

export async function updateColdLead(id: string | number, data: Partial<ColdLeadItem>) {
  try {
    const userEmail = await getUserEmail();
    if (!userEmail) throw new Error("Unauthorized");

    await directus.request(updateItem("cold_leads", id, data));
    
    revalidatePath("/dashboard/cold-outreach");
    return { success: true };
  } catch (e: any) {
    console.error("Update cold lead failed:", e);
    return { success: false, error: getDirectusErrorMessage(e) };
  }
}

export async function bulkUpdateColdLeads(ids: (string | number)[], data: Partial<ColdLeadItem>) {
    try {
        const userEmail = await getUserEmail();
        if (!userEmail) throw new Error("Unauthorized");
        
        await directus.request(updateItems("cold_leads", ids, data));
        
        revalidatePath("/dashboard/cold-outreach");
        return { success: true };
    } catch (e: any) {
        console.error("Bulk update failed:", e);
        return { success: false, error: getDirectusErrorMessage(e) };
    }
}
