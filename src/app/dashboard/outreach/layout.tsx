"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";

const ALLOWED_EMAILS = ["branislav@arcigy.group", "andrej@arcigy.group", "arcigyback@gmail.com"];

export default function OutreachLayout({ children }: { children: React.ReactNode }) {
  const { isLoaded, user } = useUser();
  const router = useRouter();

  const userEmail = user?.primaryEmailAddress?.emailAddress || (process.env.NODE_ENV === 'development' ? 'arcigyback@gmail.com' : undefined);

  useEffect(() => {
    if (isLoaded) {
        if (!userEmail || !ALLOWED_EMAILS.includes(userEmail)) {
          router.replace("/dashboard");
        }
    }
  }, [isLoaded, userEmail, router]);

  if (!isLoaded && process.env.NODE_ENV !== 'development') return null;

  if (!userEmail || !ALLOWED_EMAILS.includes(userEmail)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {children}
    </div>
  );
}
