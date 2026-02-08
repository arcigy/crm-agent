"use server";

import directus from "@/lib/directus";
import { readItems, updateItem, createItem } from "@directus/sdk";
import { currentUser } from "@clerk/nextjs/server";
import { getUserEmail } from "@/lib/auth";

export async function checkOnboardingStatus() {
  if (process.env.NODE_ENV === "development") {
    return { completed: true, userId: "dev-admin", email: "arcigyback@gmail.com" };
  }
  try {
    const email = await getUserEmail();
    if (!email) return { completed: true };

    let clerkUser = null;
    if (process.env.NODE_ENV === "development") {
        clerkUser = { firstName: "Admin", lastName: "User" };
    } else {
        clerkUser = await currentUser();
    }

    // Safety timeout for database request
    // @ts-ignore
    const usersRes = await Promise.race([
      directus.request(
        readItems("crm_users", {
          filter: { email: { _eq: email } },
          limit: 1,
        }),
      ),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Database Timeout")), 5000))
    ]);

    const users = usersRes as any[];
    let user = users?.[0];

    if (!user) {
      console.log(`Creating new CRM user for ${email}`);
      // @ts-ignore
      user = await directus.request(
        createItem("crm_users", {
          email: email,
          first_name: clerkUser?.firstName || "",
          last_name: clerkUser?.lastName || "",
          role: "user",
          status: "active",
          onboarding_completed: false,
        }),
      );
    }

    if (!user) {
      console.error("Failed to find or create user record");
      return { completed: true };
    }

    return {
      completed: !!user.onboarding_completed,
      userId: user.id || "unknown",
      email: user.email || email || "",
    };
  } catch (error) {
    console.error("Onboarding Status Check Error:", error);
    return { completed: true, userId: "error", email: "" };
  }
}

export async function getOnboardingSettings() {
  try {
    const email = await getUserEmail();
    if (!email) return null;

    // 1. Get user profile (Personal Identity)
    // @ts-ignore
    const users = await directus.request(
      readItems("crm_users", {
        filter: { email: { _eq: email } },
        limit: 1,
      }),
    );
    const user = users?.[0];
    if (!user) return null;

    // 2. Get AI Personalization (Business & AI Context)
    // @ts-ignore
    const personalization = await directus.request(
      readItems("ai_personalization", {
        filter: { user_email: { _eq: email } },
        limit: 1,
      }),
    );
    const p = personalization?.[0];

    return {
      company_name: user?.company_name || "",
      industry: user?.industry || "",
      nickname: user?.nickname || "",
      profession: user?.profession || "",
      about_me: user?.about_me || "",
      custom_instructions: user?.custom_instructions || "",
      goals: p?.business_goals || "",
      tone: p?.communication_tone || "",
      services: p?.offered_services || "",
      focus: p?.ai_focus_areas || "",
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
    const email = await getUserEmail();
    if (!email) return { success: false, error: "Unauthorized" };

    // 1. Update Core User Record (Identity)
    // @ts-ignore
    const users = await directus.request(
      readItems("crm_users", {
        filter: { email: { _eq: email } },
        limit: 1,
      }),
    );
    const user = users?.[0];
    if (!user) {
      return { success: false, error: "Užívateľ nenájdený v databáze" };
    }
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

    // 2. Update AI Personalization (Business Focus)
    // @ts-ignore
    const existingP = await directus.request(
      readItems("ai_personalization", {
        filter: { user_email: { _eq: email } },
        limit: 1,
      }),
    );

    const pData = {
      business_goals: data.goals,
      communication_tone: data.tone,
      offered_services: data.services,
      ai_focus_areas: data.focus,
      date_updated: new Date().toISOString(),
    };

    if (existingP && existingP.length > 0) {
      // @ts-ignore
      await directus.request(
        updateItem("ai_personalization", existingP[0].id, pData),
      );
    } else {
      // @ts-ignore
      await directus.request(
        createItem("ai_personalization", {
          user_email: email,
          ...pData,
        }),
      );
    }

    return { success: true };
  } catch (error: any) {
    console.error("Update Onboarding Settings Error:", error);
    return { success: false, error: error.message };
  }
}

export const saveOnboardingData = updateOnboardingSettings;
