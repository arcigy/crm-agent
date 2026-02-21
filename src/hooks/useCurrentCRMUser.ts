"use client";

import { useUser } from "@clerk/nextjs";

/**
 * Custom hook to get the current user with local dev bypass.
 */
export function useCurrentCRMUser() {
  const { user, isLoaded, isSignedIn } = useUser();
  
  // Local Dev Bypass
  const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  const bypass = process.env.NEXT_PUBLIC_BYPASS_AUTH === "true";

  if ((isLocal || bypass) && !isSignedIn) {
    return {
      user: {
        id: "dev_user_id",
        primaryEmailAddress: {
          emailAddress: "arcigyback@gmail.com"
        },
        firstName: "Dev",
        lastName: "Admin"
      },
      isLoaded: true,
      isSignedIn: true
    };
  }

  return { user, isLoaded, isSignedIn };
}
