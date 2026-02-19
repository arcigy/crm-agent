"use server";

import directus, { getDirectusErrorMessage } from "@/lib/directus";
import { createItem, readItems, updateItem, deleteItem, readItem } from "@directus/sdk";
import { revalidatePath } from "next/cache";

export async function executeDbNoteTool(
  name: string,
  args: Record<string, unknown>,
  userEmail?: string,
) {
  if (!userEmail) throw new Error("Unauthorized access to Notes Tool");

  try {
    switch (name) {
      case "db_create_note":
        const { enhanceNoteContent } = await import("./ai");
        const richContent = await enhanceNoteContent(
            (args.content as string) || "",
            userEmail
        );
        
        const newNote = await directus.request(
          createItem("crm_notes", {
            title: (args.title as string) || "Bez názvu",
            content: richContent,
            user_email: userEmail,
            contact_id: args.contact_id || null,
            project_id: args.project_id || null,
            task_id: args.task_id || null,
            file_link: args.file_link || null,
          } as any),
        );
        revalidatePath("/dashboard/notes");
        return { 
            success: true, 
            data: newNote, 
            action: "open_url",
            url: "/dashboard/notes",
            message: "Poznámka bola úspešne vytvorená. Otváram sekciu poznámok..." 
        };

      case "db_fetch_notes":
        const limit = (args.limit as number) || 10;
        const notes = await directus.request(
          readItems("crm_notes", {
            filter: { user_email: { _eq: userEmail } },
            sort: ["-date_created"],
            limit: limit,
          } as any),
        );
        return { success: true, data: notes };

      case "db_update_note":
        const noteId = args.note_id as string | number;
        if (!noteId) throw new Error("Chýba ID poznámky");
        
        // Ownership check
        const current = (await directus.request(readItem("crm_notes", noteId))) as Record<string, unknown>;
        if ((current as any).user_email !== userEmail) {
            throw new Error("Prístup zamietnutý - poznámka patrí inému používateľovi");
        }

        const updatedNote = await directus.request(
          updateItem("crm_notes", noteId, {
            title: args.title === undefined ? undefined : (args.title as string),
            content: args.content === undefined ? undefined : (args.content as string),
            contact_id: args.contact_id === undefined ? undefined : args.contact_id,
            project_id: args.project_id === undefined ? undefined : args.project_id,
            task_id: args.task_id === undefined ? undefined : args.task_id,
            file_link: args.file_link === undefined ? undefined : args.file_link,
            date_updated: new Date().toISOString(),
          } as any),
        );
        revalidatePath("/dashboard/notes");
        return { 
            success: true, 
            data: updatedNote, 
            action: "open_url",
            url: "/dashboard/notes",
            message: "Poznámka bola aktualizovaná. Otváram sekciu poznámok..." 
        };

      case "db_delete_note":
        const delId = args.note_id as string | number;
        if (!delId) throw new Error("Chýba ID poznámky");

        // Ownership check
        const toDelete = (await directus.request(readItem("crm_notes", delId))) as Record<string, unknown>;
        if ((toDelete as any).user_email !== userEmail) {
            throw new Error("Prístup zamietnutý - nemôžete vymazať poznámku iného používateľa");
        }

        await directus.request(deleteItem("crm_notes", delId));
        revalidatePath("/dashboard/notes");
        return { success: true, message: "Poznámka bola úspešne vymazaná." };

      default:
        throw new Error(`Tool ${name} not found in Notes executors`);
    }
  } catch (error) {
    console.error("Notes Executor Error:", error);
    return {
      success: false,
      error: getDirectusErrorMessage(error),
    };
  }
}
