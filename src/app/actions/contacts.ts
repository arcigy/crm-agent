"use server";
// Build trigger: 2026-01-31 13:30 - Stability & Mapping Update

import { revalidatePath } from "next/cache";
import directus from "@/lib/directus";
import { createItem, updateItem, readItems, readItem } from "@directus/sdk";

export interface ContactItem {
  id: string | number;
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company?: string;
  status?: string;
  comments?: string;
  date_created?: string;
}

export async function getContact(id: string | number) {
  try {
    const contact = (await directus.request(
      readItem("contacts", id),
    )) as unknown as ContactItem;

    if (contact) {
      // Manually fetch projects for this contact
      const projects = await directus.request(
        readItems("projects", {
          filter: { contact_id: { _eq: id } },
        }),
      );
      contact.projects = projects as unknown as any[];
    }

    return { success: true, data: contact };
  } catch (error) {
    console.error(`Failed to fetch contact ${id}:`, error);
    return { success: false, error: String(error) };
  }
}

export async function getContacts() {
  try {
    const contacts = (await directus.request(
      readItems("contacts", {
        filter: {
          deleted_at: { _null: true },
        },
        sort: ["-date_created"] as string[],
        limit: -1,
      }),
    )) as unknown as ContactItem[];

    if (contacts && contacts.length > 0) {
      // Fetch all projects to batch assign them (more efficient than N queries)
      const allProjects = (await directus.request(
        readItems("projects", {
          filter: { contact_id: { _nnull: true } },
        }),
      )) as any[];

      contacts.forEach((contact) => {
        contact.projects = allProjects.filter(
          (p) => String(p.contact_id) === String(contact.id),
        );
      });
    }

    return { success: true, data: contacts };
  } catch (error) {
    console.error("Failed to fetch contacts:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function createContact(data: Partial<ContactItem>) {
  try {
    if (!data.first_name) {
      throw new Error("First name is required");
    }

    // Save to Directus
    const drContact = await directus.request(
      createItem("contacts", {
        first_name: data.first_name,
        last_name: data.last_name || "",
        email: data.email || "",
        phone: (data.phone || "").replace(/\s/g, ""),
        company: data.company || "",
        status: data.status || "lead",
        comments: data.comments || "",
      }),
    );

    revalidatePath("/dashboard/contacts");
    return { success: true, contact: drContact as unknown as ContactItem };
  } catch (error) {
    console.error("Failed to create contact:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create contact",
    };
  }
}

export async function updateContact(
  id: number | string,
  data: Partial<ContactItem>,
) {
  try {
    await directus.request(updateItem("contacts", id, data));
    revalidatePath("/dashboard/contacts");
    return { success: true };
  } catch (error) {
    console.error("Failed to update contact:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function updateContactComments(id: number, comments: string) {
  try {
    await directus.request(updateItem("contacts", id, { comments: comments }));
    revalidatePath("/dashboard/contacts");
    return { success: true };
  } catch (error) {
    console.error("Failed to update comments:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function uploadVCard(formData: FormData) {
  try {
    const file = formData.get("file") as File;
    if (!file) throw new Error("No file provided");
    const vcardContent = await file.text();

    const contentNodes = vcardContent
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n");
    const rawCards = contentNodes
      .split("BEGIN:VCARD")
      .filter((c) => c.trim().length > 0 && c.includes("END:VCARD"));

    let successCount = 0;
    for (const rawCard of rawCards) {
      const lines = rawCard.split("\n");
      let fn = "",
        email = "",
        phone = "",
        org = "";
      for (let line of lines) {
        line = line.trim();
        if (line.startsWith("FN:")) fn = line.split(":")[1];
        else if (line.startsWith("EMAIL:")) email = line.split(":")[1];
        else if (line.startsWith("TEL:")) phone = line.split(":")[1];
        else if (line.startsWith("ORG:")) org = line.split(":")[1];
      }

      const fullName = fn || "Unknown Import";
      const nameParts = fullName.split(" ");
      const lastName = nameParts.length > 1 ? nameParts.pop() : "";
      const firstName = nameParts.join(" ");

      try {
        await directus.request(
          createItem("contacts", {
            first_name: firstName,
            last_name: lastName || "",
            email: email || "",
            phone: (phone || "").replace(/\s/g, ""),
            company: org || "",
            status: "lead",
          }),
        );
        successCount++;
      } catch (e) {
        console.error("Import failed for one contact", e);
      }
    }

    revalidatePath("/dashboard/contacts");
    return { success: true, count: successCount };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function bulkCreateContacts(contacts: any[]) {
  try {
    let successCount = 0;

    const existingContacts = await directus.request(
      readItems("contacts", {
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
      const rawName = contact.name || contact.first_name || "Neznámy";
      const nameParts = String(rawName).split(" ");
      const lastName =
        nameParts.length > 1 ? nameParts.pop() : contact.last_name || "";
      const firstName = nameParts.join(" ");

      const email = Array.isArray(contact.email)
        ? contact.email[0]
        : contact.email || "";
      const phone = Array.isArray(contact.phone || contact.tel)
        ? (contact.phone || contact.tel)[0]
        : contact.phone || contact.tel || "";
      const company = contact.company || contact.org || "";

      const normalizedEmail = String(email || "")
        .toLowerCase()
        .trim();
      if (normalizedEmail && existingEmails.has(normalizedEmail)) {
        continue; // Skip duplicates
      }

      try {
        await directus.request(
          createItem("contacts", {
            first_name: firstName,
            last_name: lastName || "",
            email: email ? String(email) : "",
            phone: phone ? String(phone).replace(/\s/g, "") : "",
            company: company ? String(company) : "",
            status: contact.status || "lead",
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
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function importGoogleContacts() {
  try {
    const { currentUser } = await import("@clerk/nextjs/server");
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const tokensRes = await directus.request(
      readItems("google_tokens", {
        filter: { user_id: { _eq: user.id } },
        limit: 1,
      }),
    );

    const tokens = (tokensRes as any[])[0];
    if (!tokens) {
      return {
        success: false,
        error: "Google account not connected or tokens missing.",
      };
    }

    const { getPeopleClient } = await import("@/lib/google");
    const people = getPeopleClient(tokens.access_token, tokens.refresh_token);

    const response = await people.people.connections.list({
      resourceName: "people/me",
      pageSize: 1000,
      personFields: "names,emailAddresses,phoneNumbers,organizations",
    });

    const connections = response.data.connections || [];
    const googleContacts = connections
      .map((person) => {
        const names = person.names || [];
        const name = names[0]?.displayName || "Google Contact";
        const emails = person.emailAddresses || [];
        const email = emails[0]?.value || "";
        const phones = person.phoneNumbers || [];
        const phone = phones[0]?.value || "";
        const orgs = person.organizations || [];
        const company = orgs[0]?.name || "";
        return { name, email, phone, company };
      })
      .filter((c) => c.email || c.phone);

    return await bulkCreateContacts(googleContacts);
  } catch (error) {
    console.error("Google Import Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function syncGoogleContacts() {
  return await importGoogleContacts();
}
