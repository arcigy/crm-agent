"use server";

import directus from "@/lib/directus";
import { readItems, updateItem, deleteItems, createItem } from "@directus/sdk";
import { currentUser } from "@clerk/nextjs/server";

export async function checkOnboardingStatus() {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) return { completed: true };

    const email = clerkUser.emailAddresses[0]?.emailAddress;
    if (!email) return { completed: true };

    // @ts-ignore
    const users = await directus.request(
      readItems("crm_users", {
        filter: { email: { _eq: email } },
        limit: 1,
      }),
    );

    let user = users?.[0];

    if (!user) {
      // @ts-ignore
      user = await directus.request(
        createItem("crm_users", {
          email: email,
          first_name: clerkUser.firstName || "",
          last_name: clerkUser.lastName || "",
          role: "user",
          status: "active",
          onboarding_completed: false,
        }),
      );
    }

    return {
      completed: user.onboarding_completed ?? false,
      userId: user.id,
      email: user.email,
    };
  } catch (error) {
    console.error("Check Onboarding Status Error:", error);
    return { completed: true };
  }
}

export async function getOnboardingSettings() {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) return null;

    const email = clerkUser.emailAddresses[0]?.emailAddress;

    // 1. Get user profile
    // @ts-ignore
    const users = await directus.request(
      readItems("crm_users", {
        filter: { email: { _eq: email } },
        limit: 1,
      }),
    );
    const user = users?.[0];

    // 2. Get AI Memories
    // @ts-ignore
    const memories = await directus.request(
      readItems("ai_memories", {
        filter: { user_email: { _eq: email } },
      }),
    );

    const getMemory = (cat: string) => {
      const m = memories.find((m: any) => m.category === cat);
      if (!m) return "";
      // Strip the prefix if it exists
      return m.fact.split(": ").slice(1).join(": ") || m.fact;
    };

    return {
      company_name: user?.company_name || "",
      industry: user?.industry || "",
      nickname: user?.nickname || "",
      profession: user?.profession || "",
      about_me: user?.about_me || "",
      custom_instructions: user?.custom_instructions || "",
      goals: getMemory("goal"),
      tone: getMemory("tone"),
      services: getMemory("services"),
      focus: getMemory("focus"),
    };
  } catch (error) {
    console.error("Get Onboarding Settings Error:", error);
    return null;
  }
}

export async function updateOnboardingSettings(data: {
  company_name: string;
  industry: string;
  nickname: string;
  profession: string;
  about_me: string;
  custom_instructions: string;
  goals: string;
  tone: string;
  services: string;
  focus: string;
}) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) return { success: false, error: "Unauthorized" };
    const email = clerkUser.emailAddresses[0]?.emailAddress;

    // 1. Update User Record
    // @ts-ignore
    const users = await directus.request(
      readItems("crm_users", {
        filter: { email: { _eq: email } },
        limit: 1,
      }),
    );
    const user = users?.[0];
    if (user) {
      // @ts-ignore
      await directus.request(
        updateItem("crm_users", user.id, {
          company_name: data.company_name,
          industry: data.industry,
          nickname: data.nickname,
          profession: data.profession,
          about_me: data.about_me,
          custom_instructions: data.custom_instructions,
          onboarding_completed: true,
          date_updated: new Date().toISOString(),
        }),
      );
    }

    // 2. Refresh Memories (Delete old ones for these categories and create new ones)
    const categories = [
      "goal",
      "tone",
      "services",
      "focus",
      "company",
      "personal",
    ];

    // @ts-ignore
    const oldMemories = await directus.request(
      readItems("ai_memories", {
        filter: {
          user_email: { _eq: email },
          category: { _in: categories },
        },
      }),
    );

    if (oldMemories.length > 0) {
      // @ts-ignore
      await directus.request(
        deleteItems(
          "ai_memories",
          oldMemories.map((m: any) => m.id),
        ),
      );
    }

    const newMemories = [
      { fact: `Cieľ používania CRM: ${data.goals}`, category: "goal" },
      { fact: `Komunikačný tón: ${data.tone}`, category: "tone" },
      { fact: `Ponúkané služby: ${data.services}`, category: "services" },
      { fact: `Priorita analýzy AI: ${data.focus}`, category: "focus" },
      {
        fact: `Firma: ${data.company_name} (Oblasť: ${data.industry})`,
        category: "company",
      },
    ];

    // @ts-ignore
    await Promise.all(
      newMemories.map((m) =>
        directus.request(
          createItem("ai_memories", {
            user_email: email,
            fact: m.fact,
            category: m.category,
            confidence: 100,
          }),
        ),
      ),
    );

    return { success: true };
  } catch (error: any) {
    console.error("Update Onboarding Settings Error:", error);
    return { success: false, error: error.message };
  }
}

export const saveOnboardingData = updateOnboardingSettings;
