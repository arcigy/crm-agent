"use server";

import directus from "@/lib/directus";
import { readItems, readItem, createItem, updateItem } from "@directus/sdk";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

import { ChatMessage } from "./agent-types";

export async function getAgentChats() {
  const user = await currentUser();
  if (!user) return [];

  try {
    const list = (await directus.request(
      readItems("agent_chats", {
        filter: {
          user_email: { _eq: user.emailAddresses[0].emailAddress },
          status: { _eq: "active" },
        },
        sort: ["-date_created"] as any,
      }),
    )) as any[];
    return list;
  } catch (err) {
    console.error("Failed to load chats:", err);
    return [];
  }
}

export async function getAgentChatById(id: string) {
  try {
    const chat = (await directus.request(readItem("agent_chats", id))) as any;
    return chat;
  } catch (err) {
    console.error("Failed to load chat:", err);
    return null;
  }
}

export async function saveAgentChat(
  id: string,
  title: string,
  messages: ChatMessage[],
) {
  const user = await currentUser();
  if (!user) return null;

  try {
    // Check existence
    const existing = (await directus.request(
      readItems("agent_chats", {
        filter: { id: { _eq: id } },
      }),
    )) as any[];

    if (existing.length > 0) {
      await directus.request(
        updateItem("agent_chats", id, {
          title,
          messages,
          date_updated: new Date().toISOString(),
        } as any),
      );
      return id;
    } else {
      const newItem = (await directus.request(
        createItem("agent_chats", {
          id,
          title,
          messages,
          user_email: user.emailAddresses[0].emailAddress,
          status: "active",
          date_created: new Date().toISOString(),
        } as any),
      )) as any;
      return newItem.id;
    }
  } catch (err) {
    console.error("Failed to save chat:", err);
    return null;
  }
}

export async function deleteAgentChat(id: string) {
  try {
    await directus.request(
      updateItem("agent_chats", id, { status: "archived" } as any),
    );
    revalidatePath("/dashboard/agent");
    return { success: true };
  } catch (err) {
    console.error("Failed to delete chat:", err);
    return { success: false };
  }
}
