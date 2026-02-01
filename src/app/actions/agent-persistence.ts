import directus from "@/lib/directus";
import { readItems, readItem, createItem, updateItem } from "@directus/sdk";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

import { ChatMessage, AgentChat } from "./agent-types";

export async function getAgentChats(): Promise<AgentChat[]> {
  const user = await currentUser();
  if (!user) return [];

  const rawEmail = user.emailAddresses[0]?.emailAddress;
  if (!rawEmail) return [];
  const email = rawEmail.toLowerCase();

  try {
    const list = await directus.request(
      readItems("agent_chats", {
        filter: {
          user_email: { _eq: email },
          status: { _eq: "active" },
        },
        sort: ["-date_created"] as string[],
      }),
    );
    return list as unknown as AgentChat[];
  } catch (err) {
    console.error("Failed to load chats:", err);
    return [];
  }
}

export async function getAgentChatById(id: string): Promise<AgentChat | null> {
  try {
    const chat = await directus.request(readItem("agent_chats", id));
    return chat as unknown as AgentChat;
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

  const rawEmail = user.emailAddresses[0]?.emailAddress;
  if (!rawEmail) return null;
  const email = rawEmail.toLowerCase();

  try {
    const existing = await directus.request(
      readItems("agent_chats", {
        filter: { id: { _eq: id } },
      }),
    );

    if (existing && (existing as any[]).length > 0) {
      await directus.request(
        updateItem("agent_chats", id, {
          title,
          messages,
          date_updated: new Date().toISOString(),
        }),
      );
      return id;
    } else {
      const newItem = await directus.request(
        createItem("agent_chats", {
          id,
          title,
          messages,
          user_email: email,
          status: "active",
          date_created: new Date().toISOString(),
        }),
      );
      return (newItem as any).id as string;
    }
  } catch (err) {
    console.error("Failed to save chat:", err);
    return null;
  }
}

export async function deleteAgentChat(id: string) {
  try {
    await directus.request(
      updateItem("agent_chats", id, { status: "archived" }),
    );
    revalidatePath("/dashboard/agent");
    return { success: true };
  } catch (err) {
    console.error("Failed to delete chat:", err);
    return { success: false };
  }
}
