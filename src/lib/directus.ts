import { createDirectus, rest, staticToken } from "@directus/sdk";
const IS_SERVER = typeof window === "undefined";

const DIRECTUS_URL = IS_SERVER
  ? (process.env.DIRECTUS_PRIVATE_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || "http://directus-buk1.railway.internal:8055")
  : (process.env.NEXT_PUBLIC_DIRECTUS_URL || "https://directus-buk1-production.up.railway.app");

console.log(`[Directus] Initializing client (${IS_SERVER ? 'Server' : 'Client'}) with URL: ${DIRECTUS_URL}`);

if (IS_SERVER && !process.env.DIRECTUS_TOKEN) {
  console.warn("⚠️ [Directus] DIRECTUS_TOKEN is missing! Client may fail unauthorized requests.");
}

const directus = createDirectus(DIRECTUS_URL)
  .with(staticToken(process.env.DIRECTUS_TOKEN || ""))
  .with(rest());

export default directus;

/**
 * Robust error extraction for Directus SDK errors
 */
export function getDirectusErrorMessage(error: unknown): string {
  if (!error) return "Neznáma chyba";
  if (error instanceof Error) return error.message;

  const err = error as any;
  // Directus SDK often returns errors in an 'errors' array if they are not standard Errors.
  // This is common when the server returns a 4xx or 5xx with a JSON body.
  if (err.errors && Array.isArray(err.errors) && err.errors.length > 0) {
    const dErr = err.errors[0];
    return dErr.message || dErr.extensions?.code || "Chyba databázy";
  }

  // Fallback for objects that might just have a message property
  if (typeof err === "object" && err.message) return err.message;

  return String(error);
}
