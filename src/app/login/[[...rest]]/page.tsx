"use client";

import { SignIn, useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect_url") || "/dashboard";

  // Auto-redirect if already signed in
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      console.log("[Login] User already signed in, redirecting to:", redirectUrl);
      router.push(redirectUrl);
    }
  }, [isLoaded, isSignedIn, router, redirectUrl]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      {/* Debug Marker */}
      <div className="fixed top-4 left-4 text-[10px] text-gray-300 font-mono">
        AUTH_READY: {isLoaded ? "YES" : "NO"} | SIGNED_IN: {isSignedIn ? "YES" : "NO"}
      </div>

      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex justify-center border border-gray-100">
        <SignIn
          appearance={{
            elements: {
              formButtonPrimary:
                "bg-black hover:bg-gray-800 transition-all text-sm uppercase tracking-widest font-bold py-4 rounded-2xl",
              card: "shadow-none border-none p-8",
              headerTitle: "text-2xl font-black text-gray-900 tracking-tighter uppercase italic",
              headerSubtitle: "text-gray-400 text-xs font-bold uppercase tracking-widest",
              socialButtonsBlockButton: "rounded-2xl border-gray-100 hover:bg-gray-50 transition-all",
              formFieldInput: "rounded-xl border-gray-100 bg-gray-50 focus:bg-white focus:ring-black transition-all",
            },
          }}
          path="/login"
          routing="path"
          forceRedirectUrl={redirectUrl}
        />
      </div>

      <div className="mt-8 text-center text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">
        &copy; {new Date().getFullYear()} RCG CRM Agent // SECURE_ACCESS
      </div>
    </div>
  );
}
