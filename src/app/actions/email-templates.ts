"use server";

import directus, { getDirectusErrorMessage } from "@/lib/directus";
import { readItems, createItem, updateItem, deleteItem } from "@directus/sdk";
import { getUserEmail } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface EmailTemplate {
  id: string | number;
  name: string;
  subject: string;
  body: string;
  category?: string;
  user_email?: string;
}

export async function getEmailTemplates() {
  try {
    const userEmail = await getUserEmail();
    if (!userEmail) throw new Error("Unauthorized");

    const templates = await directus.request(
      readItems("email_templates", {
        filter: { user_email: { _eq: userEmail } },
        sort: ["name"] as string[],
      })
    );

    return { success: true, data: (templates || []) as EmailTemplate[] };
  } catch (error) {
    console.warn("email_templates collection not accessible:", error);
    return { success: true, data: [] as EmailTemplate[] };
  }
}

export async function createEmailTemplate(item: Omit<EmailTemplate, "id">) {
  try {
    const userEmail = await getUserEmail();
    if (!userEmail) throw new Error("Unauthorized");

    const template = await directus.request(
      createItem("email_templates", {
        ...item,
        user_email: userEmail
      })
    );

    revalidatePath("/dashboard/leads");
    return { success: true, data: template };
  } catch (error: any) {
    return { success: false, error: getDirectusErrorMessage(error) };
  }
}

export async function updateEmailTemplate(id: string | number, item: Partial<EmailTemplate>) {
  try {
    await directus.request(updateItem("email_templates", id, item));
    revalidatePath("/dashboard/leads");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: getDirectusErrorMessage(error) };
  }
}

export async function deleteEmailTemplate(id: string | number) {
  try {
    await directus.request(deleteItem("email_templates", id));
    revalidatePath("/dashboard/leads");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: getDirectusErrorMessage(error) };
  }
}
