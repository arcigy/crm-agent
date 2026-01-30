"use client";

import { useState } from "react";
import { Cloud, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";

export function GoogleConnectButton({
  className = "",
}: {
  className?: string;
}) {
  const { user, isLoaded } = useUser();
  const [isLoading, setIsLoading] = useState(false);

  const isConnected = user?.externalAccounts.some(
    (acc) => acc.provider === "google",
  );

  const handleConnect = async () => {
    if (!isLoaded) return;
    setIsLoading(true);
    try {
      // Clerk Link Account Logic
      // If they are logged in with email, we add Google as an account
      // This will trigger the Google Login/Consent screen
      const googleAccount = user?.externalAccounts.find(
        (acc) => acc.provider === "google",
      );

      if (!googleAccount) {
        // This will redirect out of the app to Clerk's Google Auth
        // Make sure "Google" is enabled in Clerk dashboard!
        await user?.createExternalAccount({
          strategy: "oauth_google",
          redirectUrl: window.location.href,
        });
      }
    } catch (e: unknown) {
      console.error(e);
      const errorMessage =
        e instanceof Error ? e.message : "Skontrolujte nastavenia v Clerk";
      toast.error("Chyba prepojenia", {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoaded) return <Loader2 className="w-4 h-4 animate-spin" />;

  if (isConnected) {
    return (
      <button
        disabled
        className={`flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-sm font-bold text-green-700 shadow-sm cursor-default ${className}`}
      >
        <Check className="w-4 h-4" />
        <span>Google Prepojený (Clerk)</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={isLoading}
      className={`flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm ${className}`}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Cloud className="w-4 h-4 text-orange-500" />
      )}
      <span>Prepojiť Google (Clerk)</span>
    </button>
  );
}

export function GoogleSetupBanner() {
  return null;
}
