"use server";

import { revalidatePath } from "next/cache";
import directus, { getDirectusErrorMessage } from "@/lib/directus";
import { createItem, updateItem, readItems, readItem, deleteItem } from "@directus/sdk";
import { getUserEmail } from "@/lib/auth";
import { currentUser } from "@clerk/nextjs/server";
import { getPeopleClient } from "@/lib/google";
import { clerkClient } from "@clerk/nextjs/server";

export interface ContactLabel {
  id: string | number;
  name: string;
  color?: string;
  user_email?: string;
  google_id?: string;
}

export async function getLabels() {
  try {
    const userEmail = await getUserEmail();
    if (!userEmail) throw new Error("Unauthorized");

    // Sync labels from Google whenever labels are fetched
    // This ensures labels from Google are available in the CRM
    await syncLabelsFromGoogle().catch(err => console.error("Sync labels failed:", err));

    const labels = (await directus.request(
      readItems("contact_labels", {
        filter: { user_email: { _eq: userEmail } },
        sort: ["name"] as string[],
      })
    )) as unknown as ContactLabel[];

    return { success: true, data: labels };
  } catch (error) {
    console.error("Failed to fetch labels:", error);
    return { success: false, error: String(error) };
  }
}

export async function syncLabelsFromGoogle() {
  try {
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };
    const userEmail = user.emailAddresses[0].emailAddress.toLowerCase();
    const userId = user.id;

    const client = await clerkClient();
    const tokenResponse = await client.users.getUserOauthAccessToken(userId, "oauth_google");
    let token = tokenResponse.data[0]?.token;

    if (!token) {
        // Fallback to database tokens
        const dbTokens = await directus.request(readItems("google_tokens", {
            filter: { user_id: { _eq: userId } },
            limit: 1
        })) as any[];
        if (dbTokens && dbTokens[0]) token = dbTokens[0].access_token;
    }

    if (!token) return { success: false, error: "Google not connected" };

    const people = getPeopleClient(token);
    const response = await people.contactGroups.list({
      pageSize: 1000,
    });
    
    const groups = (response.data.contactGroups || []).filter(g => g.groupType !== 'SYSTEM_CONTACT_GROUP');

    // Get existing labels to avoid duplicates
    const existingLabels = await directus.request(readItems("contact_labels", {
      filter: { user_email: { _eq: userEmail } },
      limit: -1
    })) as any[];

    const googleIdMap = new Map();
    existingLabels.forEach(l => {
        if (l.google_id) googleIdMap.set(l.google_id, l);
    });

    for (const group of groups) {
      if (!group.resourceName || !group.name) continue;
      
      const existing = googleIdMap.get(group.resourceName);

      if (!existing) {
        await directus.request(createItem("contact_labels", {
          name: group.name,
          user_email: userEmail,
          google_id: group.resourceName,
          color: "#3b82f6"
        }));
      } else if (existing.name !== group.name) {
        await directus.request(updateItem("contact_labels", existing.id, {
          name: group.name
        }));
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Sync Labels Error:", error);
    return { success: false, error: String(error) };
  }
}

export async function createLabel(name: string, color?: string) {
  try {
    const userEmail = await getUserEmail();
    if (!userEmail) throw new Error("Unauthorized");

    const label = await directus.request(
      createItem("contact_labels", {
        name,
        color: color || "#3b82f6",
        user_email: userEmail,
      })
    );

    // Sync to Google
    await syncLabelToGoogle(label.id);

    revalidatePath("/dashboard/contacts");
    return { success: true, data: label };
  } catch (error: any) {
    return { success: false, error: getDirectusErrorMessage(error) };
  }
}

export async function updateLabel(id: string | number, name: string, color?: string) {
  try {
    const userEmail = await getUserEmail();
    if (!userEmail) throw new Error("Unauthorized");

    await directus.request(
      updateItem("contact_labels", id, { name, color })
    );

    await syncLabelToGoogle(id);

    revalidatePath("/dashboard/contacts");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: getDirectusErrorMessage(error) };
  }
}

export async function deleteLabel(id: string | number) {
  try {
    const userEmail = await getUserEmail();
    if (!userEmail) throw new Error("Unauthorized");

    const label = (await directus.request(readItem("contact_labels", id))) as any;
    
    // Delete from Google first
    if (label.google_id) {
       await deleteGoogleLabel(label.google_id);
    }

    await directus.request(deleteItem("contact_labels", id));

    revalidatePath("/dashboard/contacts");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: getDirectusErrorMessage(error) };
  }
}

export async function addLabelToContact(contactId: string | number, labelId: string | number) {
  try {
    const userEmail = await getUserEmail();
    if (!userEmail) throw new Error("Unauthorized");

    await directus.request(
      createItem("contacts_contact_labels", {
        contacts_id: contactId,
        contact_labels_id: labelId,
      })
    );

    // Trigger google sync for contact
    const { syncContactToGoogle } = await import("./google-contacts");
    await syncContactToGoogle(contactId);

    revalidatePath("/dashboard/contacts");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: getDirectusErrorMessage(error) };
  }
}

export async function removeLabelFromContact(contactId: string | number, labelId: string | number) {
  try {
    const userEmail = await getUserEmail();
    if (!userEmail) throw new Error("Unauthorized");

    const junctions = await directus.request(
      readItems("contacts_contact_labels", {
        filter: {
          _and: [
            { contacts_id: { _eq: contactId } },
            { contact_labels_id: { _eq: labelId } },
          ],
        },
      })
    ) as any[];

    if (junctions.length > 0) {
      await directus.request(deleteItem("contacts_contact_labels", junctions[0].id));
    }

    const { syncContactToGoogle } = await import("./google-contacts");
    await syncContactToGoogle(contactId);

    revalidatePath("/dashboard/contacts");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: getDirectusErrorMessage(error) };
  }
}

async function syncLabelToGoogle(labelId: string | number) {
    try {
        const user = await currentUser();
        if (!user) return;

        const { clerkClient } = await import("@clerk/nextjs/server");
        const client = await clerkClient();
        const tokenResponse = await client.users.getUserOauthAccessToken(user.id, "oauth_google");
        let token = tokenResponse.data[0]?.token;

        if (!token) return;

        const { getPeopleClient } = await import("@/lib/google");
        const people = getPeopleClient(token);

        const label = (await directus.request(readItem("contact_labels", labelId))) as any;
        if (!label) return;

        if (label.google_id) {
            await people.contactGroups.update({
                resourceName: label.google_id,
                requestBody: {
                    contactGroup: { name: label.name }
                }
            });
        } else {
            const res = await people.contactGroups.create({
                requestBody: {
                    contactGroup: { name: label.name }
                }
            });
            const googleId = (res.data as any).resourceName;
            await directus.request(updateItem("contact_labels", labelId, { google_id: googleId }));
        }
    } catch (err) {
        console.error("[Label Sync] Failed to sync label to Google:", err);
    }
}

async function deleteGoogleLabel(googleId: string) {
    try {
        const user = await currentUser();
        if (!user) return;
        const { clerkClient } = await import("@clerk/nextjs/server");
        const client = await clerkClient();
        const tokenResponse = await client.users.getUserOauthAccessToken(user.id, "oauth_google");
        let token = tokenResponse.data[0]?.token;
        if (!token) return;

        const { getPeopleClient } = await import("@/lib/google");
        const people = getPeopleClient(token);

        await people.contactGroups.delete({ resourceName: googleId, deleteContacts: false });
    } catch (err) {
        console.error("[Label Sync] Failed to delete Google label:", err);
    }
}
