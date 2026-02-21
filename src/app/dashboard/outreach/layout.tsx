"use client";

import { useCurrentCRMUser } from "@/hooks/useCurrentCRMUser";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";

const ALLOWED_EMAILS = ["branislav@arcigy.group", "andrej@arcigy.group", "arcigyback@gmail.com"];

export default function OutreachLayout({ children }: { children: React.ReactNode }) {
  const { isLoaded, user } = useCurrentCRMUser();
  const router = useRouter();

  const userEmail = user?.primaryEmailAddress?.emailAddress || (process.env.NODE_ENV === 'development' ? 'arcigyback@gmail.com' : undefined);

  useEffect(() => {
    if (isLoaded) {
        const emailLower = userEmail?.toLowerCase();
        const allowedLower = ALLOWED_EMAILS.map(e => e.toLowerCase());
        
        if (!emailLower || !allowedLower.includes(emailLower)) {
          router.replace("/dashboard");
        }
    }
  }, [isLoaded, userEmail, router]);

  if (!isLoaded && process.env.NODE_ENV !== 'development') return null;

  if (!userEmail || !ALLOWED_EMAILS.some(e => e.toLowerCase() === userEmail.toLowerCase())) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {children}
    </div>
  );
}
