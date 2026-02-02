"use client";

import { SignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

export default function RegisterPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace("/dashboard");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || isSignedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden flex justify-center">
        <SignUp
          appearance={{
            elements: {
              formButtonPrimary:
                "bg-black hover:bg-gray-900 transition-all text-sm uppercase tracking-widest font-bold py-3",
              card: "shadow-none border-none p-8",
              headerTitle: "text-2xl font-black text-gray-900",
              headerSubtitle: "text-gray-500 text-sm",
            },
          }}
          path="/register"
          fallbackRedirectUrl="/dashboard"
        />
      </div>

      <div className="mt-8 text-center text-gray-400 text-xs font-medium">
        &copy; {new Date().getFullYear()} RCG CRM Agent. Secure System.
      </div>
    </div>
  );
}
