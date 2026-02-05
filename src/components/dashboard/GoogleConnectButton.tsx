"use client";

import { useState } from "react";
import { Cloud, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";

export function GoogleConnectButton({
  className = "",
  showManageOptions = false,
}: {
  className?: string;
  showManageOptions?: boolean;
}) {
  const { user, isLoaded } = useUser();
  const [isLoading, setIsLoading] = useState(false);

  const googleAccount = user?.externalAccounts.find(
    (acc) => acc.provider === "google",
  );
  const isConnected = !!googleAccount;

  const handleConnect = async () => {
    if (!isLoaded) return;
    setIsLoading(true);
    try {
      if (!googleAccount) {
        await user?.createExternalAccount({
          strategy: "oauth_google",
          redirectUrl: window.location.href,
        });
      } else {
        // If already connected but user wants to "fix", currently just show info
        // In fully custom flows, we might remove and re-add, but that's risky for standard Clerk setups
        toast.info("Účet je už prepojený", { description: "Pre re-autorizáciu odstráňte prepojenie v profile." });
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
    if (!showManageOptions) {
        return null; // Hide in dashboard header as requested
    }
    
    // Show detailed status in Settings
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <div className="flex items-center gap-2.5 px-4 py-2 bg-green-50/50 border border-green-200/50 rounded-lg text-[13px] font-semibold text-green-700 w-full">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)] animate-pulse" />
            <span>Prepojené: {googleAccount.emailAddress || "Google účet"}</span>
        </div>
        <p className="text-[10px] text-muted-foreground px-1">
            Ak sa udalosti nezobrazujú, skontrolujte či ste pri prihlasovaní povolili prístup ku Kalendáru.
        </p>
      </div>
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
