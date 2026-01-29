import directus from "./directus";
import { readItems } from "@directus/sdk";

export type AIContextType =
  | "EMAIL_REPLY"
  | "LEAD_ANALYSIS"
  | "PROJECT_MANAGEMENT"
  | "USER_COACHING"
  | "GLOBAL";

interface ContextBundle {
  systemInstructions: string;
  memories: string[];
  userProfile: {
    nickname?: string;
    profession?: string;
    about_me?: string;
    company_name?: string;
    industry?: string;
  };
}

/**
 * High-Level Context Selector
 * Ensures AI gets ONLY relevant information to avoid context pollution.
 */
export async function getIsolatedAIContext(
  email: string,
  type: AIContextType,
): Promise<ContextBundle> {
  try {
    // 1. Fetch User Profile
    // @ts-ignore
    const users = await directus.request(
      readItems("crm_users", {
        filter: { email: { _eq: email } },
        limit: 1,
      }),
    );
    const user = users?.[0] || {};

    // 2. Fetch Relevant Memories based on type
    let categories: string[] = [];

    switch (type) {
      case "EMAIL_REPLY":
        categories = ["tone", "services", "focus", "personal"];
        break;
      case "LEAD_ANALYSIS":
        categories = ["industry", "services", "focus", "goal"];
        break;
      case "PROJECT_MANAGEMENT":
        categories = ["goal", "services", "company"];
        break;
      case "USER_COACHING":
        categories = ["personal", "goal", "tone"];
        break;
      case "GLOBAL":
        categories = [
          "goal",
          "tone",
          "services",
          "focus",
          "company",
          "personal",
          "manual",
        ];
        break;
    }

    // @ts-ignore
    const memories = await directus.request(
      readItems("ai_memories", {
        filter: {
          user_email: { _eq: email },
          category: { _in: categories },
        },
      }),
    );

    // 3. Assemble isolated bundle
    return {
      systemInstructions: user.custom_instructions || "",
      memories: memories.map((m: any) => m.fact),
      userProfile: {
        nickname: user.nickname,
        profession: user.profession,
        about_me:
          type === "USER_COACHING" || type === "GLOBAL"
            ? user.about_me
            : undefined,
        company_name: user.company_name,
        industry: user.industry,
      },
    };
  } catch (error) {
    console.error("Context Isolation Error:", error);
    return { systemInstructions: "", memories: [], userProfile: {} };
  }
}
