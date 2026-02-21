import { currentUser, auth, clerkClient } from "@clerk/nextjs/server";
import { cache } from "react";
import { shouldBypassAuth, DEV_ADMIN_EMAIL } from "./dev-mode/auth-bypass";

/**
 * Gets the current user's email with high reliability. Cached per request.
 */
export const getUserEmail = cache(async function getUserEmail(retries = 3): Promise<string | null> {
  const session = await auth();
  const userId = session.userId;
  
  if (!userId) {
    if (shouldBypassAuth()) {
      console.log(`[Auth] @LOCAL_DEV_BYPASS: Using ${DEV_ADMIN_EMAIL}`);
      return DEV_ADMIN_EMAIL;
    }
    console.warn("[Auth] No session found, user is definitely not logged in.");
    return null;
  }

  for (let i = 0; i <= retries; i++) {
    try {
      // Strategy 1: Standard currentUser hook (uses internal session token)
      const user = await currentUser();
      const email = user?.emailAddresses[0]?.emailAddress?.toLowerCase();
      
      if (email) {
        if (i > 0) console.log(`[Auth] User email recovered via currentUser on attempt ${i + 1}`);
        return email;
      }
      
      // Strategy 2: Direct API fetch (more expensive but bypasses cookie sync issues)
      try {
        const client = await clerkClient();
        const fullUser = await client.users.getUser(userId);
        const directEmail = fullUser.emailAddresses[0]?.emailAddress?.toLowerCase();
        
        if (directEmail) {
          console.log(`[Auth] User email recovered via direct clerkClient on attempt ${i + 1}`);
          return directEmail;
        }
      } catch (apiErr) {
        console.warn("[Auth] Direct API fetch failed, retrying...", apiErr);
      }
      
      if (i < retries) {
        const delay = 400 * (i + 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    } catch (err) {
      console.error(`[Auth] Error in attempt ${i + 1}:`, err);
    }
  }
  
  console.error(`[Auth] Failed to authorize user ${userId} after ${retries + 1} attempts`);
  return null;
});

/**
 * Returns a list of emails that the current user is authorized to see data for.
 * Implements "Arcigy Team" logic: Branislav and Andrej see each other's data.
 * Cached per request.
 */
export const getAuthorizedEmails = cache(async function getAuthorizedEmails(): Promise<string[]> {
    const email = await getUserEmail();
    if (!email) return [];

    const TEAM_MEMBERS = [
        "branislav@arcigy.group",
        "andrej@arcigy.group",
        "branislav@acg.group",
        "andrej@acg.group"
    ];

    if (TEAM_MEMBERS.includes(email.toLowerCase())) {
        return TEAM_MEMBERS;
    }

    return [email];
});

/**
 * Checks if a given email belongs to the Arcigy team.
 */
export function isTeamMember(email: string | null | undefined): boolean {
    if (!email) return false;
    const TEAM_MEMBERS = [
        "branislav@arcigy.group",
        "andrej@arcigy.group",
        "branislav@acg.group",
        "andrej@acg.group"
    ];
    return TEAM_MEMBERS.includes(email.toLowerCase());
}
