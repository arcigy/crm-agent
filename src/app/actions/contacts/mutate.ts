import { revalidatePath } from "next/cache";
import directus, { getDirectusErrorMessage } from "@/lib/directus";
import { createItem, updateItem, readItem } from "@directus/sdk";
import { getUserEmail, isTeamMember } from "@/lib/auth";
import { ContactItem } from "@/types/contact";
import { syncContactToGoogle } from "../google-contacts";

export async function createContact(data: Partial<ContactItem>) {
  try {
    const userEmail = await getUserEmail();
    if (!userEmail) throw new Error("Unauthorized");

    if (!data.first_name) {
      throw new Error("First name is required");
    }

    const drContact = await directus.request(
      createItem("contacts", {
        first_name: data.first_name,
        last_name: data.last_name || "",
        email: data.email || "",
        phone: (data.phone || "").replace(/\s/g, ""),
        company: data.company || "",
        status: data.status || "lead",
        comments: data.comments || "",
        user_email: userEmail,
      }),
    );

    revalidatePath("/dashboard/contacts");
    await syncContactToGoogle(drContact.id);

    return { 
        success: true, 
        contact: {
            id: drContact.id,
            first_name: drContact.first_name,
            last_name: drContact.last_name,
            email: drContact.email,
            user_email: drContact.user_email
        } as ContactItem 
    };
  } catch (error) {
    console.error("Failed to create contact:", error);
    return {
      success: false,
      error: getDirectusErrorMessage(error)
    };
  }
}

export async function updateContact(
  id: number | string,
  data: Partial<ContactItem>,
) {
  try {
    const email = await getUserEmail();
    if (!email) throw new Error("Unauthorized");

    const current = (await directus.request(readItem("contacts", id))) as Record<string, unknown>;
    if (!isTeamMember(current.user_email as string)) throw new Error("Access denied");

    await directus.request(updateItem("contacts", id, data));
    const syncRes = await syncContactToGoogle(id);
    
    revalidatePath("/dashboard/contacts");
    return { 
      success: true, 
      sync: syncRes.success, 
      syncError: syncRes.error 
    };
  } catch (error) {
    console.error("Failed to update contact:", error);
    return {
      success: false,
      error: getDirectusErrorMessage(error)
    };
  }
}

export async function deleteContact(id: string | number) {
  try {
    const userEmail = await getUserEmail();
    if (!userEmail) throw new Error("Unauthorized");

    const current = (await directus.request(readItem("contacts", id))) as Record<string, unknown>;
    if (!current || current.user_email !== userEmail) {
      throw new Error("Contact not found or access denied");
    }

    await directus.request(updateItem("contacts", id, {
      status: "archived",
      deleted_at: new Date().toISOString()
    }));

    try {
      await syncContactToGoogle(id);
    } catch (googleErr) {
      console.error("[Sync] Google delete failed:", googleErr);
    }

    revalidatePath("/dashboard/contacts");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete contact:", error);
    return { 
      success: false, 
      error: getDirectusErrorMessage(error) 
    };
  }
}

export async function updateContactComments(id: number | string, comments: string) {
  return updateContact(id, { comments });
}
