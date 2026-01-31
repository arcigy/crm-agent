import { createDirectus, rest, staticToken } from "@directus/sdk";

// Use private network URL for server-side, public URL for client-side
const DIRECTUS_URL =
  typeof window === "undefined"
    ? process.env.DIRECTUS_URL || "http://directus-buk1.railway.internal:8055"
    : process.env.NEXT_PUBLIC_DIRECTUS_URL ||
      "https://directus-buk1-production.up.railway.app";

const directus = createDirectus(DIRECTUS_URL)
  .with(
    staticToken(
      process.env.DIRECTUS_TOKEN || "3cSXW-vP-3ujjyXvS0-htoPcsSQOZ5GE",
    ),
  )
  .with(rest());

export default directus;

/**
 * Robust error extraction for Directus SDK errors
 */
export function getDirectusErrorMessage(error: any): string {
  if (!error) return "Neznáma chyba";
  if (error instanceof Error) return error.message;

  // Directus SDK often returns errors in an 'errors' array if they are not standard Errors.
  // This is common when the server returns a 4xx or 5xx with a JSON body.
  if (error.errors && Array.isArray(error.errors) && error.errors.length > 0) {
    const dErr = error.errors[0];
    return dErr.message || dErr.extensions?.code || "Chyba databázy";
  }

  // Fallback for objects that might just have a message property
  if (typeof error === "object" && error.message) return error.message;

  return String(error);
}
