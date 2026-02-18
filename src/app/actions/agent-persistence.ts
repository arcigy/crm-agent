import directus from "@/lib/directus";
import { readItems, readItem, createItem, updateItem } from "@directus/sdk";
import { revalidatePath } from "next/cache";
import { getUserEmail } from "@/lib/auth";

import { ChatMessage, AgentChat } from "./agent-types";

export async function getAgentChats(): Promise<AgentChat[]> {
  const email = await getUserEmail();
  if (!email) return [];

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
  const email = await getUserEmail();
  if (!email) return null;

  try {
    const chat = await directus.request(readItem("agent_chats", id)) as AgentChat;
    if (chat.user_email?.toLowerCase() !== email.toLowerCase()) {
        console.warn(`Access denied to chat ${id} for user ${email}`);
        return null;
    }
    return chat as AgentChat;
  } catch (err) {
    console.error("Failed to load chat:", err);
    return null;
  }
}

export async function saveAgentChat(
  id: string,
  title: string,
  messages: ChatMessage[],
  context?: any // AgentContext
) {
  const email = await getUserEmail();
  if (!email) return null;

  try {
    const existing = await directus.request(
      readItems("agent_chats", {
        filter: { id: { _eq: id } },
      }),
    );

    if (existing && (existing as unknown as AgentChat[]).length > 0) {
      await directus.request(
        updateItem("agent_chats", id, {
          title,
          messages,
          context: context || null,
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
          context: context || null,
          user_email: email,
          status: "active",
          date_created: new Date().toISOString(),
        }),
      );
      return (newItem as unknown as AgentChat).id as string;
    }
  } catch (err) {
    console.error("Failed to save chat:", err);
    return null;
  }
}

export async function deleteAgentChat(id: string) {
  const email = await getUserEmail();
  if (!email) return { success: false };

  try {
    const current = await directus.request(readItem("agent_chats", id)) as AgentChat;
    if (current.user_email?.toLowerCase() !== email.toLowerCase()) {
        return { success: false };
    }

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
