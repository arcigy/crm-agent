"use client";

import { useUser } from "@clerk/nextjs";
import { Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";

const ALLOWED_EMAILS = ["branislav@arcigy.group"];

export default function OutreachLayout({ children }: { children: React.ReactNode }) {
  const { isLoaded, user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded) {
        const userEmail = user?.primaryEmailAddress?.emailAddress;
        if (!userEmail || !ALLOWED_EMAILS.includes(userEmail)) {
          router.replace("/dashboard");
        }
    }
  }, [isLoaded, user, router]);

  if (!isLoaded) return null;

  const userEmail = user?.primaryEmailAddress?.emailAddress;
  if (!userEmail || !ALLOWED_EMAILS.includes(userEmail)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {children}
    </div>
  );
}
