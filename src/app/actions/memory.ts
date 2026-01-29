"use server";

import directus from "@/lib/directus";
import { readItems, createItem, updateItem, deleteItem } from "@directus/sdk";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function getAIMemories() {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) return [];

    const email = clerkUser.emailAddresses[0]?.emailAddress;

    // @ts-ignore
    return await directus.request(
      readItems("ai_memories", {
        filter: { user_email: { _eq: email } },
        sort: ["-date_created"],
      }),
    );
  } catch (error) {
    console.error("Get AI Memories Error:", error);
    return [];
  }
}

export async function addAIMemory(fact: string, category: string = "manual") {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) return { success: false, error: "Unauthorized" };

    const email = clerkUser.emailAddresses[0]?.emailAddress;

    // @ts-ignore
    await directus.request(
      createItem("ai_memories", {
        user_email: email,
        fact,
        category,
        confidence: 100,
      }),
    );

    revalidatePath("/dashboard/settings/memory");
    return { success: true };
  } catch (error: any) {
    console.error("Add AI Memory Error:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteAIMemory(id: string) {
  try {
    // @ts-ignore
    await directus.request(deleteItem("ai_memories", id));
    revalidatePath("/dashboard/settings/memory");
    return { success: true };
  } catch (error: any) {
    console.error("Delete AI Memory Error:", error);
    return { success: false, error: error.message };
  }
}

export async function updateAIMemory(id: string, fact: string) {
  try {
    // @ts-ignore
    await directus.request(
      updateItem("ai_memories", id, {
        fact,
        date_updated: new Date().toISOString(),
      }),
    );
    revalidatePath("/dashboard/settings/memory");
    return { success: true };
  } catch (error: any) {
    console.error("Update AI Memory Error:", error);
    return { success: false, error: error.message };
  }
}
