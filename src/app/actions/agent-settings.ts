"use server";

import directus from "@/lib/directus";
import { readItems, updateItem, createItem } from "@directus/sdk";
import { getUserEmail } from "@/lib/auth";

export interface AgentSettings {
  agent_name: string;
  mode: "fast" | "balanced" | "precise";
  proactive: boolean;
  confidence_threshold: number;
  tools_allowed: string[];
  notifications: "browser" | "email" | "silent";
  memory_recall: "short" | "medium" | "long";
}

const DEFAULT_SETTINGS: AgentSettings = {
  agent_name: "ArciGy Agent",
  mode: "balanced",
  proactive: true,
  confidence_threshold: 65,
  tools_allowed: ["contacts", "calendar", "notes", "deals", "tasks", "projects"],
  notifications: "browser",
  memory_recall: "medium",
};

export async function getAgentSettings(): Promise<AgentSettings> {
  try {
    const email = await getUserEmail();
    if (!email) return DEFAULT_SETTINGS;

    const personalization = (await directus.request(
      readItems("ai_personalization", {
        filter: { user_email: { _eq: email } },
        limit: 1,
      }),
    )) as any[];
    
    const p = personalization?.[0];
    if (p && p.ai_focus_areas) {
      try {
        // Try to parse the agent config from focus_areas if it starts with '{'
        if (p.ai_focus_areas.trim().startsWith('{')) {
          const config = JSON.parse(p.ai_focus_areas);
          return { ...DEFAULT_SETTINGS, ...config };
        }
      } catch (e) {
        console.warn("Failed to parse agent config from ai_focus_areas", e);
      }
    }

    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error("Get Agent Settings Error:", error);
    return DEFAULT_SETTINGS;
  }
}

export async function updateAgentSettings(data: AgentSettings) {
  try {
    const email = await getUserEmail();
    if (!email) return { success: false, error: "Unauthorized" };

    const existingP = (await directus.request(
      readItems("ai_personalization", {
        filter: { user_email: { _eq: email } },
        limit: 1,
      }),
    )) as any[];

    const configString = JSON.stringify(data);

    if (existingP && existingP.length > 0) {
      await directus.request(
        updateItem("ai_personalization", existingP[0].id, {
          ai_focus_areas: configString,
          date_updated: new Date().toISOString(),
        }),
      );
    } else {
      await directus.request(
        createItem("ai_personalization", {
          user_email: email,
          ai_focus_areas: configString,
          date_created: new Date().toISOString(),
          date_updated: new Date().toISOString(),
        }),
      );
    }

    return { success: true };
  } catch (error: any) {
    console.error("Update Agent Settings Error:", error);
    return { success: false, error: error.message };
  }
}
