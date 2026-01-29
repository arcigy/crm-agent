import directus from "./directus";
import { readItems } from "@directus/sdk";

export type AIContextType =
  | "EMAIL_REPLY"
  | "LEAD_ANALYSIS"
  | "PROJECT_MANAGEMENT"
  | "USER_COACHING"
  | "GLOBAL";

/**
 * STRUCTURED CONTEXT BUNDLE
 * These are the variables you should inject into your AI Prompts.
 */
export interface AIContextBundle {
  // 1. Personal Identity (from crm_users)
  user_nickname: string;
  user_profession: string;
  user_about_me: string;
  user_custom_instructions: string;

  // 2. Business Perspective (from ai_personalization)
  business_company_name: string;
  business_industry: string;
  business_goals: string;
  business_services: string;

  // 3. AI Behavior (from ai_personalization)
  communication_tone: string;
  ai_focus_areas: string;

  // 4. Learned Facts (from ai_memories)
  learned_memories: string[];
}

/**
 * Context Selector
 * Fetches only relevant data for a specific tool to avoid context pollution.
 */
export async function getIsolatedAIContext(
  email: string,
  type: AIContextType,
): Promise<AIContextBundle> {
  try {
    // Fetch User Identity (crm_users)
    // @ts-ignore
    const users = await directus.request(
      readItems("crm_users", {
        filter: { email: { _eq: email } },
        limit: 1,
      }),
    );
    const user = users?.[0] || {};

    // Fetch Business Context (ai_personalization)
    // @ts-ignore
    const personalization = await directus.request(
      readItems("ai_personalization", {
        filter: { user_email: { _eq: email } },
        limit: 1,
      }),
    );
    const p = personalization?.[0] || {};

    // Fetch Learned Facts (ai_memories)
    // Only fetch general facts here.
    // @ts-ignore
    const memories = await directus.request(
      readItems("ai_memories", {
        filter: { user_email: { _eq: email } },
        sort: ["-date_created"],
      }),
    );

    // Assemble with Isolation Logic
    const bundle: AIContextBundle = {
      user_nickname: user.nickname || "",
      user_profession: user.profession || "",
      // Isolated: Only give personal context if coaching/global
      user_about_me:
        type === "USER_COACHING" || type === "GLOBAL"
          ? user.about_me || ""
          : "",
      user_custom_instructions: user.custom_instructions || "",

      business_company_name: user.company_name || "",
      business_industry: user.industry || "",
      // Isolated: Email reply doesn't need long-term internal business goals
      business_goals: type !== "EMAIL_REPLY" ? p.business_goals || "" : "",
      business_services: p.offered_services || "",

      communication_tone: p.communication_tone || "",
      ai_focus_areas: p.ai_focus_areas || "",

      learned_memories: memories.map((m: any) => m.fact),
    };

    return bundle;
  } catch (error) {
    console.error("Context Isolation Error:", error);
    return {
      user_nickname: "",
      user_profession: "",
      user_about_me: "",
      user_custom_instructions: "",
      business_company_name: "",
      business_industry: "",
      business_goals: "",
      business_services: "",
      communication_tone: "",
      ai_focus_areas: "",
      learned_memories: [],
    };
  }
}
