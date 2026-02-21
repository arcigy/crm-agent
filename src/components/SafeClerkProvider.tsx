"use client";

import React from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { shouldBypassAuth } from "@/lib/dev-mode/auth-bypass";

export function SafeClerkProvider({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const isLiveKey = publishableKey?.startsWith('pk_live_');

  // If we are on localhost and using a LIVE key, we skip ClerkProvider 
  // to avoid the "Production Keys only allowed for domain" error.
  if (isLocal && isLiveKey) {
    return <>{children}</>;
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      signInUrl="/login"
      signUpUrl="/register"
      signInForceRedirectUrl="/dashboard"
      signUpForceRedirectUrl="/dashboard"
    >
      {children}
    </ClerkProvider>
  );
}
