"use server";

import { getGmailClient, getValidToken } from "@/lib/google";

export async function getGmail(userId: string, userEmail?: string) {
  const token = await getValidToken(userId, userEmail);
  if (!token || token === "MISSING_REFRESH_TOKEN") return token;
  return await getGmailClient(token);
}
