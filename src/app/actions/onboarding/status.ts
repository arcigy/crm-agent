"use server";

import directus from "@/lib/directus";
import { readItems, createItem } from "@directus/sdk";
import { currentUser } from "@clerk/nextjs/server";
import { getUserEmail } from "@/lib/auth";

export async function checkOnboardingStatus() {
  if (process.env.NODE_ENV === "development") {
    return { completed: true, userId: "dev-admin", email: "arcigyback@gmail.com" };
  }
  try {
    const email = await getUserEmail();
    if (!email) return { completed: true };

    const clerkUser = await currentUser();

    const usersRes = (await Promise.race([
      directus.request(
        readItems("crm_users", {
          filter: { email: { _eq: email } },
          limit: 1,
        }),
      ),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Database Timeout")), 5000))
    ])) as Record<string, unknown>[];

    let user = usersRes?.[0];

    if (!user) {
      console.log(`Creating new CRM user for ${email}`);
      user = (await directus.request(
        createItem("crm_users", {
          email: email,
          first_name: clerkUser?.firstName || "",
          last_name: clerkUser?.lastName || "",
          role: "user",
          status: "active",
          onboarding_completed: false,
        }),
      )) as Record<string, unknown>;
    }

    if (!user) {
      console.error("Failed to find or create user record");
      return { completed: true };
    }

    return {
      completed: !!user.onboarding_completed,
      userId: (user.id as string) || "unknown",
      email: (user.email as string) || email || "",
    };
  } catch (error) {
    console.error("Onboarding Status Check Error:", error);
    return { completed: true, userId: "error", email: "" };
  }
}
