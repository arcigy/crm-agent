import { google } from "googleapis";

const getBaseUrl = () => {
  // Hardcoded production URL fallback to eliminate env var mistakes
  if (process.env.NODE_ENV === "production") {
    return (
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://crm-agent-production-d1eb.up.railway.app"
    );
  }
  return "http://localhost:3000";
};

const getRedirectUrl = () => {
  // FRONTEND-FIRST STRATEGY: Redirect to a visible page, then POST to API
  return `${(getBaseUrl() || "").toString().replace(/\/$/, "")}/oauth-callback`;
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

export async function refreshAccessToken(refreshToken: string) {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await client.refreshAccessToken();
  return credentials;
}

export async function sendEmail({ accessToken, to, subject, body }: { accessToken: string, to: string, subject: string, body: string }) {
    const gmail = getGmailClient(accessToken);
    
    // Create RFC 2822 message
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    const messageParts = [
        `To: ${to}`,
        `Content-Type: text/html; charset=utf-8`,
        `MIME-Version: 1.0`,
        `Subject: ${utf8Subject}`,
        '',
        body
    ];
    const message = messageParts.join('\n');
    
    // The body needs to be base64url encoded
    const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
            raw: encodedMessage
        }
    });
}
