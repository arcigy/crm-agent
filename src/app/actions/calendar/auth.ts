import { currentUser } from "@clerk/nextjs/server";
import { getValidToken } from "@/lib/google";

export async function getAccessToken() {
  const user = await currentUser();
  if (!user) return null;

  const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase();
  return await getValidToken(user.id, userEmail);
}

export async function getCalendarConnectionStatus() {
  const token = await getAccessToken();
  return { isConnected: !!token };
}

export async function disconnectGoogle() {
  // Logic to remove tokens if needed, for now just success
  return { success: true };
}
