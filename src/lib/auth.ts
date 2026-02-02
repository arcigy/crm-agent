import { currentUser, auth } from "@clerk/nextjs/server";

/**
 * Gets the current user's email with retry logic and fallback
 * to handle flaky Clerk sessions on refresh.
 */
export async function getUserEmail(retries = 2): Promise<string | null> {
  for (let i = 0; i <= retries; i++) {
    try {
      const user = await currentUser();
      const email = user?.emailAddresses[0]?.emailAddress?.toLowerCase();
      
      if (email) return email;
      
      // If we have a userId but no user object, Clerk might be slow
      const session = await auth();
      if (!session.userId) return null; // Definitely not logged in
      
      // If we have userId but no email yet, wait a bit and retry
      if (i < retries) {
        console.log(`[Auth] Retry ${i + 1} for user email...`);
        await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
        continue;
      }
    } catch (err) {
      console.error("[Auth] Error fetching user email:", err);
      if (i === retries) return null;
    }
  }
  return null;
}
