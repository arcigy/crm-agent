// Helper for creating OAuth2 Client dynamically to avoid bundling issues
async function getOAuth2Client(accessToken?: string, refreshToken?: string, redirectUri?: string) {
    const { google } = await import("googleapis");
    
    // Fallback logic for Redirect URI
    const getBaseUrl = () => {
        if (process.env.NODE_ENV === "production") {
            return process.env.NEXT_PUBLIC_APP_URL || "https://crm.arcigy.cloud";
        }
        return "http://localhost:3000";
    };
    
    const base = getBaseUrl().toString().replace(/\/$/, "");
    const finalRedirect = redirectUri || `${base}/oauth-callback`;

    const client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        finalRedirect
    );

    if (accessToken) {
        client.setCredentials({
            access_token: accessToken,
            refresh_token: refreshToken
        });
    }

    return client;
}

const SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/contacts",
  "https://www.googleapis.com/auth/drive",
];

export async function getAuthUrl(state?: string, redirectUri?: string, forceConsent: boolean = false): Promise<string> {
    const client = await getOAuth2Client(undefined, undefined, redirectUri);
    return client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES,
        prompt: "consent",
        state: state || "",
    });
}

export async function getTokensFromCode(code: string, redirectUri?: string) {
    const client = await getOAuth2Client(undefined, undefined, redirectUri);
    try {
        const { tokens } = await client.getToken(code);
        return tokens;
    } catch (err: any) {
        console.error("❌ Google Exchange Error Details:", err.message);
        throw err;
    }
}

async function fetchWithRetry(fn: () => Promise<any>, retries = 1): Promise<any> {
    try {
        return await fn();
    } catch (err: any) {
        if (retries > 0) {
            console.log(`[retry] Fetch failed, retrying... (${retries} left)`);
            await new Promise((r) => setTimeout(r, 500));
            return fetchWithRetry(fn, retries - 1);
        }
        throw err;
    }
}

export async function getValidToken(clerkUserId: string, userEmail?: string) {
    if (!clerkUserId || clerkUserId.trim() === '') {
        console.error(`[getValidToken] Error: Called with empty userId for ${userEmail}`);
        return null;
    }
    console.log(`[getValidToken] Checking token for user: ${clerkUserId} (${userEmail})`);
    try {
        const { default: directus } = await import("@/lib/directus");
        const { readItems, updateItem } = await import("@directus/sdk");

        const filters: any[] = [{ user_id: { _eq: clerkUserId } }];
        if (userEmail) filters.push({ user_email: { _eq: userEmail.toLowerCase() } });

        console.log(`[getValidToken] Searching Directus for existing tokens...`);
        
        const tokens = await fetchWithRetry(async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            try {
                return (await directus.request(
                    readItems("google_tokens" as any, {
                        filter: { _or: filters },
                        limit: 1,
                    })
                )) as any[];
            } catch (err: any) {
                if (err.name === 'AbortError') {
                    throw new Error('Directus request timeout');
                }
                throw err;
            } finally {
                clearTimeout(timeoutId);
            }
        }, 1);

        console.log(`[getValidToken] Directus response received. Tokens found: ${Array.isArray(tokens) ? tokens.length : 0}`);

        if (Array.isArray(tokens) && tokens.length > 0) {
            const tokenRecord = tokens[0];
            const expiryDate = tokenRecord.expiry_date ? new Date(tokenRecord.expiry_date).getTime() : 0;
            const now = Date.now();

            console.log(`[getValidToken] DB Token Expiry: ${tokenRecord.expiry_date} (Now: ${new Date(now).toISOString()})`);

            // If still valid (with 5 min buffer)
            const isExpired = expiryDate ? (now > expiryDate - 300000) : false;
            
            // If we don't have expiry_date, check how old the record is. If > 1 hour, it's likely stale.
            const dateUpdated = tokenRecord.date_updated ? new Date(tokenRecord.date_updated).getTime() : 0;
            const isStale = !expiryDate && (now - dateUpdated > 3600000); 

            if (!isExpired && !isStale) {
                console.log(`[getValidToken] DB Token is being used (Expiry: ${tokenRecord.expiry_date || 'N/A'}).`);
                return tokenRecord.access_token as string;
            }

            if (tokenRecord.refresh_token && (isExpired || isStale)) {
                console.log(`[getValidToken] DB Token expired/near-expiry, attempting refresh...`);
                try {
                    const credentials = await refreshAccessToken(tokenRecord.refresh_token);
                    const newTokenData: any = {
                        access_token: credentials.access_token,
                        date_updated: new Date().toISOString(),
                    };
                    if (credentials.expiry_date) {
                        // Google returns expiry_date as a timestamp in ms
                        newTokenData.expiry_date = credentials.expiry_date;
                    } else {
                        // Default to 1 hour if not provided
                        newTokenData.expiry_date = Date.now() + 3500 * 1000;
                    }

                    await directus.request(
                        updateItem("google_tokens" as any, tokenRecord.id, newTokenData)
                    );
                    
                    // Also update PostgreSQL directly for consistency
                    try {
                        const { db } = await import('@/lib/db');
                        await db.query(`
                            UPDATE google_tokens
                            SET access_token = $1, expiry_date = $2, date_updated = NOW()
                            WHERE id = $3
                        `, [credentials.access_token, newTokenData.expiry_date, tokenRecord.id]);
                    } catch (dbErr) {
                        console.error("[getValidToken] Failed to update PG:", dbErr);
                    }

                    console.log(`[getValidToken] Refresh successful stored in DB.`);
                    return credentials.access_token as string;
                } catch (refreshError: any) {
                    console.error("❌ [getValidToken] Failed to refresh DB token:", refreshError.message || refreshError);
                    // Continue to Clerk fallback if refresh fails
                }
                console.log(`[getValidToken] DB Token expired but no refresh_token found. Fallback to Clerk.`);
                // Fall through to Clerk fallback
            }
        } else {
            console.log(`[getValidToken] No token found in Directus.`);
        }

        // --- Clerk Fallback ---
        console.log(`[getValidToken] Falling back to Clerk Oauth Token...`);
        const { clerkClient } = await import("@clerk/nextjs/server");
        const client = await clerkClient();
        
        try {
            console.log(`[getValidToken] Fetching Clerk token for: ${clerkUserId}`);
            const clerkResponse = await client.users.getUserOauthAccessToken(clerkUserId, "oauth_google");
            console.log(`[getValidToken] Clerk response: ${clerkResponse.data.length} tokens found.`);
            
            const clerkTokenData = clerkResponse.data.find(t => t.provider === "oauth_google") || clerkResponse.data[0];

            if (clerkTokenData && clerkTokenData.token) {
                console.log(`[getValidToken] Obtained token from Clerk.`);
                return clerkTokenData.token;
            }
        } catch (clerkErr: any) {
            if (clerkErr.status === 400 || clerkErr.status === 422) {
                // These are expected when the user hasn't linked Google or the session is invalid
                console.log(`[getValidToken] Google account not linked in Clerk (Status: ${clerkErr.status}). skipping calendar.`);
            } else {
                console.error("❌ [getValidToken] Clerk OAuth error:", clerkErr.status, clerkErr.message);
                if (clerkErr.errors) {
                    console.error("Details:", JSON.stringify(clerkErr.errors, null, 2));
                }
            }
            return null;
        }

        console.warn(`[getValidToken] No token found in Clerk either.`);
        return null;
    } catch (err: any) {
        console.error("❌ [getValidToken] Final catch block error:", err.message || err);
        return null;
    }
}

export async function getCalendarClient(accessToken: string, refreshToken?: string) {
    const { google } = await import("googleapis");
    const auth = await getOAuth2Client(accessToken, refreshToken);
    return google.calendar({ version: "v3", auth });
}

export async function getGmailClient(accessToken: string, refreshToken?: string) {
    const { google } = await import("googleapis");
    const auth = await getOAuth2Client(accessToken, refreshToken);
    return google.gmail({ version: "v1", auth });
}

export async function getPeopleClient(accessToken: string, refreshToken?: string) {
    const { google } = await import("googleapis");
    const auth = await getOAuth2Client(accessToken, refreshToken);
    return google.people({ version: "v1", auth });
}

export async function getDriveClient(accessToken: string, refreshToken?: string) {
    const { google } = await import("googleapis");
    const auth = await getOAuth2Client(accessToken, refreshToken);
    return google.drive({ version: "v3", auth });
}

export async function refreshAccessToken(refreshToken: string) {
    const client = await getOAuth2Client();
    client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await client.refreshAccessToken();
    return credentials;
}

export async function sendEmail({
    accessToken,
    to,
    subject,
    body,
    threadId,
    inReplyTo,
    references,
}: {
    accessToken: string;
    to: string;
    subject: string;
    body: string;
    threadId?: string;
    inReplyTo?: string;
    references?: string;
}) {
    const gmail = await getGmailClient(accessToken);
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString("base64")}?=`;
    const messageParts = [
        `To: ${to}`,
        `Content-Type: text/html; charset=utf-8`,
        `MIME-Version: 1.0`,
        `Subject: ${utf8Subject}`,
    ];

    if (inReplyTo) messageParts.push(`In-Reply-To: ${inReplyTo}`);
    if (references) messageParts.push(`References: ${references}`);
    
    messageParts.push("");
    messageParts.push(body);

    const message = messageParts.join("\n");
    const encodedMessage = Buffer.from(message)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

    await gmail.users.messages.send({
        userId: "me",
        requestBody: { 
            raw: encodedMessage,
            threadId: threadId
        },
    });
}
