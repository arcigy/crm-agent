"use server";

import { revalidatePath } from "next/cache";
import directus, { getDirectusErrorMessage } from "@/lib/directus";
import { createItem, readItems, deleteItem } from "@directus/sdk";
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
  user_email?: string;
  date_created?: string;
  date_updated?: string;
}

export async function getColdLeads() {
  try {
    const userEmail = await getUserEmail();
    if (!userEmail) throw new Error("Unauthorized");

    const leads = (await directus.request(
      readItems("cold_leads", {
        filter: {
          user_email: { _eq: userEmail },
        },
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

export async function bulkCreateColdLeads(leads: Partial<ColdLeadItem>[]) {
  try {
    const userEmail = await getUserEmail();
    if (!userEmail) throw new Error("Unauthorized");

    const formattedLeads = leads.map(l => ({
      ...l,
      user_email: userEmail,
      status: l.status || "new"
    }));

    // Directus supports bulk create via array
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
