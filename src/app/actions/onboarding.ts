"use server";

import directus from "@/lib/directus";
import { readItems, updateItem, createItem, readMe } from "@directus/sdk";
import { currentUser } from "@clerk/nextjs/server";

export async function checkOnboardingStatus() {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) return { completed: true }; // Should not happen in dashboard

    const email = clerkUser.emailAddresses[0]?.emailAddress;
    if (!email) return { completed: true };

    // 1. Get user from Directus
    // @ts-ignore
    const users = await directus.request(
      readItems("crm_users", {
        filter: { email: { _eq: email } },
        limit: 1,
      }),
    );

    let user = users?.[0];

    // 2. If user doesn't exist in Directus, create them
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
    return { completed: true }; // Defensive: don't block if API fails
  }
}

export async function saveOnboardingData(data: {
  company_name: string;
  industry: string;
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
    if (!user) return { success: false, error: "User not found" };

    // @ts-ignore
    await directus.request(
      updateItem("crm_users", user.id, {
        company_name: data.company_name,
        industry: data.industry,
        onboarding_completed: true,
        date_updated: new Date().toISOString(),
      }),
    );

    // 2. Save memory bits to ai_memories
    const memories = [
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
      memories.map((m) =>
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
    console.error("Save Onboarding Data Error:", error);
    return { success: false, error: error.message };
  }
}
