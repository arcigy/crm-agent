import { google } from 'googleapis';

// Google OAuth2 klient
// Ensure APP_URL doesn't end with slash to avoid double slash in callback URL
const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${baseUrl}/api/google/callback`
);

// Scopes pre Google služby
const SCOPES = [
    'https://www.googleapis.com/auth/calendar',         // Plný prístup ku kalendáru
    'https://www.googleapis.com/auth/gmail.modify',     // Čítanie, posielanie a správa e-mailov
    'https://www.googleapis.com/auth/contacts',         // Plný prístup ku kontaktom (Import/Export)
    'https://www.googleapis.com/auth/drive.file',       // Prístup k súborom vytvoreným aplikáciou (Bezpečné)
    'https://www.googleapis.com/auth/tasks',            // Plný prístup k Google Tasks (Úlohám)
    'https://www.googleapis.com/auth/userinfo.email',   // Získanie emailu používateľa (na identifikáciu)
    'https://www.googleapis.com/auth/userinfo.profile'  // Získanie mena
];

// Generuj OAuth URL pre autorizáciu
export function getAuthUrl(state?: string): string {
    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent', // Vždy pýtať súhlas pre získanie refresh_tokenu
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
    oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
    return google.calendar({ version: 'v3', auth: oauth2Client });
}

// Nastav credentials a vráť gmail klienta
export function getGmailClient(accessToken: string, refreshToken?: string) {
    oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
    return google.gmail({ version: 'v1', auth: oauth2Client });
}

// Nastav credentials a vráť people klienta (kontakty)
export function getPeopleClient(accessToken: string, refreshToken?: string) {
    oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
    return google.people({ version: 'v1', auth: oauth2Client });
}

// Nastav credentials a vráť drive klienta
export function getDriveClient(accessToken: string, refreshToken?: string) {
    oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
    return google.drive({ version: 'v3', auth: oauth2Client });
}

// Nastav credentials a vráť tasks klienta
export function getTasksClient(accessToken: string, refreshToken?: string) {
    oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
    return google.tasks({ version: 'v1', auth: oauth2Client });
}

// Refresh access token
export async function refreshAccessToken(refreshToken: string) {
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await oauth2Client.refreshAccessToken();
    return credentials;
}

export { oauth2Client };
