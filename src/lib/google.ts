import { google } from 'googleapis';

// Google OAuth2 klient
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/google/callback`
        : 'http://localhost:3000/api/google/callback'
);

// Scopes pre Google Calendar a Gmail API
const SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/gmail.modify', // Čítanie a správa e-mailov
];

// Generuj OAuth URL pre autorizáciu
export function getAuthUrl(state?: string): string {
    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent',
        state: state || '',
    });
}

// Vymeniť auth code za tokeny
export async function getTokensFromCode(code: string) {
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
}

// Nastav credentials a vráť calendar klienta
export function getCalendarClient(accessToken: string, refreshToken?: string) {
    oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
    });

    return google.calendar({ version: 'v3', auth: oauth2Client });
}

// Nastav credentials a vráť gmail klienta
export function getGmailClient(accessToken: string, refreshToken?: string) {
    oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
    });

    return google.gmail({ version: 'v1', auth: oauth2Client });
}

// Refresh access token
export async function refreshAccessToken(refreshToken: string) {
    oauth2Client.setCredentials({
        refresh_token: refreshToken,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();
    return credentials;
}

export { oauth2Client };
