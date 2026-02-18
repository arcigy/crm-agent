"use server";

import { getGmailClient, getValidToken } from "@/lib/google";

export async function getGmail(userId: string, userEmail?: string) {
  const token = await getValidToken(userId, userEmail);
  if (!token) throw new Error("Google account not connected");
  return await getGmailClient(token);
}
