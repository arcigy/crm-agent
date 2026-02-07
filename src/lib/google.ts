import { google } from "googleapis";

export const getBaseUrl = () => {
  // Hardcoded production URL fallback to eliminate env var mistakes
  if (process.env.NODE_ENV === "production") {
    return (
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://crm-agent-production-d1eb.up.railway.app"
    );
  }
  return "http://localhost:3000";
};

export const getRedirectUrl = () => {
  // FRONTEND-FIRST STRATEGY: Redirect to a visible page, then POST to API
  const baseUrl = getBaseUrl() || "";
  return `${baseUrl.toString().replace(/\/$/, "")}/oauth-callback`;
};

// Funkcia na vytvorenie novej inštancie klienta
const createOAuthClient = (redirectUri?: string) => {
  const finalRedirect = redirectUri || getRedirectUrl();
  console.log("🔧 Creating OAuth Client with Redirect URI:", finalRedirect);

  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    finalRedirect,
  );
};

const SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/contacts",
];

// Lazy client getter to avoid side effects during build
export const getOauth2Client = (redirectUri?: string) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error("Missing Google OAuth credentials in environment");
  }
  return createOAuthClient(redirectUri);
};

export function getAuthUrl(state?: string, redirectUri?: string): string {
  const client = getOauth2Client(redirectUri || getRedirectUrl());
  return client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "select_account",
    state: state || "",
  });
}

export async function getTokensFromCode(code: string, redirectUri?: string) {
  const client = createOAuthClient(redirectUri);
  const { tokens } = await client.getToken(code);
  return tokens;
}

// Helpers for clients...
const getClientWithCredentials = (
  accessToken: string,
  refreshToken?: string,
) => {
  // For API calls, redirect URI doesn't matter as much, but we use the same factory
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  return client;
};

export function getCalendarClient(accessToken: string, refreshToken?: string) {
  return google.calendar({
    version: "v3",
    auth: getClientWithCredentials(accessToken, refreshToken),
  });
}

export function getGmailClient(accessToken: string, refreshToken?: string) {
  return google.gmail({
    version: "v1",
    auth: getClientWithCredentials(accessToken, refreshToken),
  });
}

export function getPeopleClient(accessToken: string, refreshToken?: string) {
  return google.people({
    version: "v1",
    auth: getClientWithCredentials(accessToken, refreshToken),
  });
}

export function getDriveClient(accessToken: string, refreshToken?: string) {
  return google.drive({
    version: "v3",
    auth: getClientWithCredentials(accessToken, refreshToken),
  });
}

export function getTasksClient(accessToken: string, refreshToken?: string) {
  return google.tasks({
    version: "v1",
    auth: getClientWithCredentials(accessToken, refreshToken),
  });
}

export async function getGoogleAccessToken(userId: string) {
    try {
        const directus = (await import("@/lib/directus")).default;
        const { readItems, updateItem } = await import("@directus/sdk");

        // 1. Check our database FIRST (it has refresh tokens)
        const dbTokens = await directus.request(readItems("google_tokens" as any, {
            filter: { user_id: { _eq: userId } },
            limit: 1
        })) as any[];

        if (dbTokens && dbTokens[0]) {
            const tokenRecord = dbTokens[0];
            const now = new Date();
            const expiry = tokenRecord.expiry_date ? new Date(tokenRecord.expiry_date) : null;

            // If token is expired or expiring soon (within 5 mins), and we have a refresh token
            if (tokenRecord.refresh_token && (!expiry || expiry.getTime() - now.getTime() < 300000)) {
                console.log("[Google Auth] Refreshing token for user:", userId);
                try {
                    const newCreds = await refreshAccessToken(tokenRecord.refresh_token);
                    const updateData: any = {
                        access_token: newCreds.access_token,
                        date_updated: new Date().toISOString()
                    };
                    if (newCreds.expiry_date) {
                        updateData.expiry_date = new Date(newCreds.expiry_date).toISOString();
                    }
                    await directus.request(updateItem("google_tokens" as any, tokenRecord.id, updateData));
                    return { access_token: newCreds.access_token, refresh_token: tokenRecord.refresh_token };
                } catch (refreshErr) {
                    console.error("[Google Auth] Refresh failed:", refreshErr);
                    // Fall through to Clerk if possible, or return existing (dangerous)
                }
            }
            return { access_token: tokenRecord.access_token, refresh_token: tokenRecord.refresh_token };
        }

        // 2. Fallback to Clerk (Social Login token)
        const { clerkClient } = await import("@clerk/nextjs/server");
        const client = await clerkClient();
        const tokenResponse = await client.users.getUserOauthAccessToken(userId, "oauth_google");
        const token = tokenResponse.data[0]?.token;

        if (token) return { access_token: token };

        return null;
    } catch (error) {
        console.error("[Google Auth] Error getting token:", error);
        return null;
    }
}

export async function refreshAccessToken(refreshToken: string) {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await client.refreshAccessToken();
  return credentials;
}
