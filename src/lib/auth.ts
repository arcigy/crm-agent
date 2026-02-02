import { currentUser, auth, clerkClient } from "@clerk/nextjs/server";

/**
 * Gets the current user's email with high reliability.
 * Uses multiple strategies: standard currentUser(), session fallback,
 * and direct management API fetch as a last resort.
 */
export async function getUserEmail(retries = 3): Promise<string | null> {
  const session = await auth();
  const userId = session.userId;
  
  if (!userId) {
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
}
