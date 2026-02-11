import directus from "@/lib/directus";
import { readItems, updateItem, createItem } from "@directus/sdk";
import { getUserEmail } from "@/lib/auth";

export async function getOnboardingSettings() {
  try {
    const email = await getUserEmail();
    if (!email) return null;

    const users = (await directus.request(
      readItems("crm_users", {
        filter: { email: { _eq: email } },
        limit: 1,
      }),
    )) as Record<string, unknown>[];
    
    const user = users?.[0];
    if (!user) return null;

    const personalization = (await directus.request(
      readItems("ai_personalization", {
        filter: { user_email: { _eq: email } },
        limit: 1,
      }),
    )) as Record<string, unknown>[];
    
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

    const users = (await directus.request(
      readItems("crm_users", {
        filter: { email: { _eq: email } },
        limit: 1,
      }),
    )) as Record<string, unknown>[];
    
    const user = users?.[0];
    if (!user) {
      return { success: false, error: "Užívateľ nenájdený v databáze" };
    }

    await directus.request(
      updateItem("crm_users", user.id as string | number, {
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

    const existingP = (await directus.request(
      readItems("ai_personalization", {
        filter: { user_email: { _eq: email } },
        limit: 1,
      }),
    )) as Record<string, unknown>[];

    const pData = {
      business_goals: data.goals,
      communication_tone: data.tone,
      offered_services: data.services,
      ai_focus_areas: data.focus,
      date_updated: new Date().toISOString(),
    };

    if (existingP && existingP.length > 0) {
      await directus.request(
        updateItem("ai_personalization", existingP[0].id as string | number, pData),
      );
    } else {
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
