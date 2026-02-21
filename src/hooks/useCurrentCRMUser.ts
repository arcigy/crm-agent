"use client";

import { useUser } from "@clerk/nextjs";
import { shouldBypassAuth, getDevUser } from "@/lib/dev-mode/auth-bypass";

/**
 * Custom hook to get the current user with local dev bypass.
 */
export function useCurrentCRMUser() {
  const { user, isLoaded, isSignedIn } = useUser();
  
  if (shouldBypassAuth() && !isSignedIn) {
    return {
      user: getDevUser(),
      isLoaded: true,
      isSignedIn: true
    };
  }

  return { user, isLoaded, isSignedIn };
}
