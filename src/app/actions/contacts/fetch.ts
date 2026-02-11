"use server";

import directus from "@/lib/directus";
import { readItems, readItem } from "@directus/sdk";
import { getAuthorizedEmails } from "@/lib/auth";
import { ContactItem, Project, Deal, Activity } from "@/types/contact";

export async function getContact(id: string | number) {
  try {
    const authEmails = await getAuthorizedEmails();
    if (authEmails.length === 0) throw new Error("Unauthorized");

    const contact = (await directus.request(
      readItem("contacts", id),
    )) as unknown as ContactItem;

    if (!contact || !contact.user_email || !authEmails.includes(contact.user_email)) {
      return { success: false, error: "Contact not found or access denied" };
    }

    const [projects, deals, activities] = await Promise.all([
      directus.request(
        readItems("projects", {
          filter: {
            _and: [
              { contact_id: { _eq: id } },
              { user_email: { _in: authEmails } },
            ],
          },
        }),
      ),
      directus.request(
        readItems("deals", {
          filter: {
            _and: [
              { contact_id: { _eq: id } },
              { user_email: { _in: authEmails } },
            ],
          },
        }),
      ),
      directus.request(
        readItems("activities", {
          filter: { contact_id: { _eq: id } },
        }),
      ),
    ]);

    contact.projects = projects as unknown as Project[];
    contact.deals = deals as unknown as Deal[];
    contact.activities = activities as unknown as Activity[];

    return { success: true, data: contact };
  } catch (error) {
    console.error(`Failed to fetch contact ${id}:`, error);
    return { success: false, error: String(error) };
  }
}

export async function getContacts() {
  try {
    const authEmails = await getAuthorizedEmails();
    if (authEmails.length === 0) throw new Error("Unauthorized");

    const contacts = (await directus.request(
      readItems("contacts", {
        filter: {
          _and: [
            { deleted_at: { _null: true } },
            { user_email: { _in: authEmails } },
          ],
        },
        fields: [
          "*",
          "labels.contacts_contact_labels_id.*",
          "labels.contact_labels_id.*",
        ] as string[],
        sort: ["-date_created"] as string[],
        limit: 500,
      }),
    )) as unknown as ContactItem[];

    if (contacts && contacts.length > 0) {
      const allProjects = (await directus.request(
        readItems("projects", {
          filter: {
            _and: [
              { contact_id: { _nnull: true } },
              { user_email: { _in: authEmails } },
            ],
          },
          limit: 500,
        }),
      )) as unknown as Project[];

      const projectsByContact = new Map<string, Project[]>();
      allProjects.forEach(p => {
        const cid = String(p.contact_id);
        if (!projectsByContact.has(cid)) projectsByContact.set(cid, []);
        projectsByContact.get(cid)!.push(p);
      });

      contacts.forEach((contact) => {
        contact.projects = projectsByContact.get(String(contact.id)) || [];
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
