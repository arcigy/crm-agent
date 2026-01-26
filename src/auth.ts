import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import directus from "@/lib/directus"
import { readItems, createItem, updateItem } from "@directus/sdk"

export const { handlers, signIn, signOut, auth } = NextAuth({
    debug: true,
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: {
                params: {
                    prompt: "consent",
                    access_type: "offline",
                    response_type: "code",
                    scope: "openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/contacts https://www.googleapis.com/auth/tasks"
                },
            },
        }),
    ],
    callbacks: {
        async signIn({ user, account, profile }) {
            if (account?.provider === "google") {
                try {
                    console.log("Saving Google Tokens to Directus...");
                    const userEmail = user.email;

                    if (!userEmail) return true;

                    // @ts-ignore
                    const existingTokens = await directus.request(readItems('google_tokens', {
                        filter: { user_email: { _eq: userEmail } },
                        limit: 1
                    }));

                    const tokenData = {
                        user_email: userEmail,
                        access_token: account.access_token,
                        refresh_token: account.refresh_token,
                        scope: account.scope,
                        expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
                        date_updated: new Date().toISOString()
                    };

                    if (existingTokens && existingTokens.length > 0) {
                        if (!tokenData.refresh_token) delete tokenData.refresh_token;
                        // @ts-ignore
                        await directus.request(updateItem('google_tokens', existingTokens[0].id, tokenData));
                    } else {
                        // @ts-ignore
                        await directus.request(createItem('google_tokens', tokenData));
                    }
                    console.log("✅ Tokens Saved!");
                    return true;
                } catch (error) {
                    console.error("⚠️ NextAuth DB Save Failed (Non-fatal):", error);
                    return true;
                }
            }
            return true;
        },
        async redirect({ url, baseUrl }) {
            return `${baseUrl}/dashboard?google_connected=true`;
        }
    },
    useSecureCookies: process.env.NODE_ENV === "production",
    trustHost: true, // Fix for Railway UntrustedHost error
})
