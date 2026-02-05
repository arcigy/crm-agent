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
const createOAuthClient = () => {
  const redirectUrl = getRedirectUrl();
  console.log("🔧 Creating OAuth Client with Redirect URI:", redirectUrl);

  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUrl,
  );
};

export const oauth2Client = createOAuthClient();

const SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/contacts",
];

export function getAuthUrl(state?: string): string {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
    state: state || "",
  });
}

export async function getTokensFromCode(code: string) {
  const client = createOAuthClient();
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

export async function sendEmail({
  accessToken,
  refreshToken,
  to,
  subject,
  body,
}: {
  accessToken: string;
  refreshToken?: string;
  to: string;
  subject: string;
  body: string;
}) {
  const gmail = getGmailClient(accessToken, refreshToken);
  
  // Create RFC 2822 message
  const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
  const messageParts = [
    `To: ${to}`,
    `Subject: ${utf8Subject}`,
    'Mime-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    body,
  ];
  const message = messageParts.join('\n');

  // Base64url encode the message
  const encodedEmail = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedEmail,
    },
  });

  return res.data;
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
