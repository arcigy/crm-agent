"use server";

import { revalidatePath } from "next/cache";
import directus from "@/lib/directus";
import { createItem } from "@directus/sdk";
import { getUserEmail } from "@/lib/auth";

export async function uploadVCard(formData: FormData) {
  try {
    const userEmail = await getUserEmail();
    if (!userEmail) throw new Error("Unauthorized");

    const file = formData.get("file") as File;
    if (!file) throw new Error("No file provided");
    const vcardContent = await file.text();

    const rawCards = vcardContent
      .split("BEGIN:VCARD")
      .filter((c) => c.trim().length > 0 && c.includes("END:VCARD"));

    let successCount = 0;
    for (const rawCard of rawCards) {
      const lines = rawCard.split("\n");
      let fn = "", email = "", phone = "", org = "";
      
      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith("FN:")) fn = trimmed.split(":")[1];
        else if (trimmed.startsWith("EMAIL:")) email = trimmed.split(":")[1];
        else if (trimmed.startsWith("TEL:")) phone = trimmed.split(":")[1];
        else if (trimmed.startsWith("ORG:")) org = trimmed.split(":")[1];
      });

      const nameParts = (fn || "Unknown").split(" ");
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
            user_email: userEmail,
          }),
        );
        successCount++;
      } catch (e) {
        console.error("VCard import item failed", e);
      }
    }

    revalidatePath("/dashboard/contacts");
    return { success: true, count: successCount };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
