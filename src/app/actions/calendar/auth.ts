import directus from "@/lib/directus";
import { readItems } from "@directus/sdk";
import { clerkClient, currentUser } from "@clerk/nextjs/server";

export async function getAccessToken() {
  const user = await currentUser();
  if (!user) return null;

  try {
    const client = await clerkClient();
    const response = await client.users.getUserOauthAccessToken(
      user.id,
      "oauth_google",
    );
    const clerkToken = response.data[0]?.token;
    if (clerkToken) return clerkToken;
  } catch (err) {
    // Fallback to Directus
  }

  try {
    const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase();
    const tokens = await directus.request(readItems('google_tokens', {
        filter: { 
            _or: [
                { user_id: { _eq: user.id } },
                { user_email: { _eq: userEmail } }
            ]
        },
        limit: 1
    })) as Record<string, unknown>[];

    if (tokens && tokens.length > 0) {
        const t = tokens[0];
        if (t.expiry_date && new Date(t.expiry_date as string) < new Date()) {
            return null;
        }
        return t.access_token as string;
    }
  } catch (err) {
    console.error("[Calendar] Directus token fetch failed:", err);
  }

  return null;
}

export async function getCalendarConnectionStatus() {
  const token = await getAccessToken();
  return { isConnected: !!token };
}

export async function disconnectGoogle() {
  // Logic to remove tokens if needed, for now just success
  return { success: true };
}
