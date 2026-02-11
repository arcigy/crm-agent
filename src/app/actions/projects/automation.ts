"use server";

import directus from "@/lib/directus";
import { readItems } from "@directus/sdk";
import { currentUser, clerkClient } from "@clerk/nextjs/server";
import { getUserEmail } from "@/lib/auth";
import { updateFolderDescription } from "@/lib/google-drive";
import { getProjects } from "./fetch";

export async function syncAllProjectDescriptions() {
  try {
    const email = await getUserEmail();
    if (!email) throw new Error("Unauthorized");
    
    const user = await currentUser();
    if (!user) throw new Error("Unauthorized");

    const client = await clerkClient();
    const tokenRes = await client.users.getUserOauthAccessToken(
      user.id,
      "oauth_google",
    );
    const token = tokenRes.data[0]?.token;
    if (!token) throw new Error("Google Token not found");

    const { data: projects } = await getProjects();
    if (!projects) return { success: false, message: "No projects found" };

    const contacts = (await directus.request(
      readItems("contacts", {
        filter: { user_email: { _eq: email } },
        fields: ["id", "first_name", "last_name"] as string[],
        limit: 500,
      }),
    )) as Record<string, unknown>[];

    const results = { total: 0, updated: 0, failed: 0 };

    for (const p of projects) {
      if (p.drive_folder_id) {
        results.total++;
        try {
          let name = p.contact_name;
          if (!name || name === "Neznámy") {
            const c = contacts.find(
              (c) => String(c.id) === String(p.contact_id),
            );
            if (c) name = `${(c.first_name as string) || ""} ${(c.last_name as string) || ""}`.trim();
          }

          if (name && name !== "Neznámy") {
            await updateFolderDescription(
              token,
              p.drive_folder_id,
              `Client: ${name}`,
            );
            results.updated++;
          } else {
            results.failed++;
          }
        } catch (err) {
          console.error(`[Sync] Failed project ${p.id}:`, err);
          results.failed++;
        }
      }
    }

    return { success: true, results };
  } catch (error) {
    console.error("Sync failed:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
