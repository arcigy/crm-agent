import { google } from 'googleapis';

// Pomocná funkcia na získanie Base URL a odstránenie trailign slash
const getBaseUrl = () => {
    // Preferujeme server-side env var, potom public
    const url = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return url.replace(/\/$/, '');
};

const getRedirectUrl = () => {
    return `${getBaseUrl()}/api/google/callback`;
};

// Funkcia na vytvorenie novej inštancie klienta s aktuálnou redirect URL
// Toto rieši problém s mismatchom URL v serverless prostredí
const createOAuthClient = () => {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        getRedirectUrl()
    );
};

// Inicializácia globálneho klienta pre iné použitie (ak treba), 
// ale pre auth flow použijeme createOAuthClient()
export const oauth2Client = createOAuthClient();

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
    const client = createOAuthClient();
    return client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent', // Vždy pýtať súhlas pre získanie refresh_tokenu
        state: state || '',
    });
}

// Vymeniť auth code za tokeny
export async function getTokensFromCode(code: string) {
    const client = createOAuthClient();
    const { tokens } = await client.getToken(code);
    return tokens;
}

// Helper na nastavenie credentials pre existujúceho klienta
const getClientWithCredentials = (accessToken: string, refreshToken?: string) => {
    const client = createOAuthClient();
    client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
    return client;
};

// Nastav credentials a vráť calendar klienta
export function getCalendarClient(accessToken: string, refreshToken?: string) {
    const auth = getClientWithCredentials(accessToken, refreshToken);
    return google.calendar({ version: 'v3', auth });
}

// Nastav credentials a vráť gmail klienta
export function getGmailClient(accessToken: string, refreshToken?: string) {
    const auth = getClientWithCredentials(accessToken, refreshToken);
    return google.gmail({ version: 'v1', auth });
}

// Nastav credentials a vráť people klienta (kontakty)
export function getPeopleClient(accessToken: string, refreshToken?: string) {
    const auth = getClientWithCredentials(accessToken, refreshToken);
    return google.people({ version: 'v1', auth });
}

// Nastav credentials a vráť drive klienta
export function getDriveClient(accessToken: string, refreshToken?: string) {
    const auth = getClientWithCredentials(accessToken, refreshToken);
    return google.drive({ version: 'v3', auth });
}

// Nastav credentials a vráť tasks klienta
export function getTasksClient(accessToken: string, refreshToken?: string) {
    const auth = getClientWithCredentials(accessToken, refreshToken);
    return google.tasks({ version: 'v1', auth });
}

// Refresh access token
export async function refreshAccessToken(refreshToken: string) {
    const client = createOAuthClient();
    client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await client.refreshAccessToken();
    return credentials;
}
