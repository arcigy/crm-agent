"use client";

import { useUser } from "@clerk/nextjs";
import { shouldBypassAuth, getDevUser } from "@/lib/dev-mode/auth-bypass";

/**
 * Custom hook to get the current user with local dev bypass.
 */
export function useCurrentCRMUser() {
  const isBypass = shouldBypassAuth();
  
  let clerkData: any = { user: null, isLoaded: false, isSignedIn: false, signOut: () => {} };
  
  try {
    const data = useUser();
    // Wrap signOut if it exists
    const { signOut } = (window as any).Clerk || {};
    clerkData = { ...data, signOut: signOut || (() => {}) };
  } catch (e) {
    if (!isBypass) console.error("Clerk useUser failed", e);
  }

  if (isBypass && !clerkData.isSignedIn) {
    return {
      user: getDevUser(),
      isLoaded: true,
      isSignedIn: true,
      signOut: () => { window.location.href = "/"; }
    };
  }

  return clerkData;
}
