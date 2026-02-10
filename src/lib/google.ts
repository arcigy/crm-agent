import { google } from "googleapis";

const getBaseUrl = () => {
  // Hardcoded production URL fallback to eliminate env var mistakes
  if (process.env.NODE_ENV === "production") {
    // If we have NEXT_PUBLIC_APP_URL, use it, otherwise fallback to our main subdomain
    return (
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://crm.arcigy.cloud"
    );
  }
  // For development
  return "http://localhost:3000";
};

const getRedirectUrl = () => {
  const base = getBaseUrl().toString().replace(/\/$/, "");
  return `${base}/oauth-callback`;
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
  "https://www.googleapis.com/auth/drive",
];

export const oauth2Client = createOAuthClient();

export function getAuthUrl(state?: string, redirectUri?: string): string {
  const client = createOAuthClient(redirectUri);
  return client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "select_account consent",
    state: state || "",
  });
}

export async function getTokensFromCode(code: string, redirectUri?: string) {
  const finalRedirect = redirectUri || getRedirectUrl();
  console.log("📡 Exchanging code for tokens with Redirect URI:", finalRedirect);
  const client = createOAuthClient(finalRedirect);
  try {
    const { tokens } = await client.getToken(code);
    return tokens;
  } catch (err: any) {
    console.error("❌ Google Exchange Error Details:", {
      message: err.message,
      response: err.response?.data,
      redirectUsed: finalRedirect
    });
    throw err;
  }
}

// Unified token getter with automatic refresh
export async function getValidToken(clerkUserId: string, userEmail?: string) {
  try {
    const { default: directus } = await import("@/lib/directus");
    const { readItems, updateItem, createItem } = await import("@directus/sdk");

    // Strategy 1: Check Directus cache first (fastest, supports offline)
    const filters: any[] = [{ user_id: { _eq: clerkUserId } }];
    if (userEmail) filters.push({ user_email: { _eq: userEmail.toLowerCase() } });

    const tokens = await directus.request(
      readItems("google_tokens" as any, {
        filter: { _or: filters },
        limit: 1,
      }),
    );

    if (Array.isArray(tokens) && tokens.length > 0) {
      const tokenRecord = tokens[0];
      const expiryDate = tokenRecord.expiry_date
        ? new Date(tokenRecord.expiry_date).getTime()
        : 0;
      const now = Date.now();

      // If valid, return it
      if (expiryDate && now < expiryDate - 60000) {
        return tokenRecord.access_token;
      }

      // If expired but we have a refresh token, try to refresh it
      if (tokenRecord.refresh_token) {
        console.log("🔄 Token expired, refreshing for user:", clerkUserId);
        try {
          const credentials = await refreshAccessToken(tokenRecord.refresh_token);
          const newTokenData: any = {
            access_token: credentials.access_token,
            date_updated: new Date().toISOString(),
          };
          if (credentials.expiry_date) {
            newTokenData.expiry_date = new Date(credentials.expiry_date).toISOString();
          }

          await directus.request(
            updateItem("google_tokens" as any, tokenRecord.id, newTokenData),
          );
          return credentials.access_token;
        } catch (refreshError) {
          console.error("❌ Failed to refresh token, falling back to Clerk:", refreshError);
        }
      }
    }

    // Strategy 2: Fallback to Clerk (The "Classic" way that worked before)
    console.log("🔑 Fetching fresh token from Clerk for user:", clerkUserId);
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    const clerkResponse = await client.users.getUserOauthAccessToken(clerkUserId, "oauth_google");
    
    const clerkTokenData = clerkResponse.data[0];
    if (clerkTokenData && clerkTokenData.token) {
        // Sync Clerk's token back to Directus so we have it for background tasks
        const tokenData = {
            user_id: clerkUserId,
            user_email: userEmail?.toLowerCase() || null,
            access_token: clerkTokenData.token,
            // Clerk doesn't always provide refresh_token here unless configured, 
            // but we at least get the access_token
            date_updated: new Date().toISOString(),
            expiry_date: null // We don't always know it from Clerk response easily
        };

        if (Array.isArray(tokens) && tokens.length > 0) {
            await directus.request(updateItem("google_tokens" as any, tokens[0].id, tokenData));
        } else {
            // @ts-expect-error - Directus SDK types
            await directus.request(createItem("google_tokens", {
                ...tokenData,
                date_created: new Date().toISOString()
            }));
        }

        return clerkTokenData.token;
    }

    return null;
  } catch (err) {
    console.error("Error in getValidToken:", err);
    return null;
  }
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

export async function refreshAccessToken(refreshToken: string) {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await client.refreshAccessToken();
  return credentials;
}

export async function sendEmail({
  accessToken,
  to,
  subject,
  body,
}: {
  accessToken: string;
  to: string;
  subject: string;
  body: string;
}) {
  const gmail = getGmailClient(accessToken);

  // Create RFC 2822 message
  const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString("base64")}?=`;
  const messageParts = [
    `To: ${to}`,
    `Content-Type: text/html; charset=utf-8`,
    `MIME-Version: 1.0`,
    `Subject: ${utf8Subject}`,
    "",
    body,
  ];
  const message = messageParts.join("\n");

  // The body needs to be base64url encoded
  const encodedMessage = Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodedMessage,
    },
  });
}
