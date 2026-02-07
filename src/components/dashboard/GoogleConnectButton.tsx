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
      // Use our custom flow which now forces 'select_account'
      const res = await fetch('/api/google/auth-url');
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Nepodarilo sa vygenerovať autorizačnú URL");
      }
    } catch (e: unknown) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : "Chyba prepojenia";
      toast.error("Chyba prepojenia", { description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoaded) return <Loader2 className="w-4 h-4 animate-spin" />;

  if (isConnected) {
    if (!showManageOptions) {
        return null; // Keep it hidden in header/sidebar if already connected
    }
    
    const handleReauthorize = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/google/auth-url');
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          throw new Error("Nepodarilo sa vygenerovať autorizačnú URL");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Chyba re-autorizácie";
        toast.error(msg);
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <div className={`flex flex-col gap-3 ${className}`}>
        <div className="flex items-center gap-2.5 px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-border rounded-xl text-[13px] font-semibold text-foreground w-full">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)] animate-pulse" />
            <div className="flex flex-col text-left">
              <span className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground mb-0.5">Pripojený účet</span>
              <span className="text-[12px] font-medium">{googleAccount.emailAddress}</span>
            </div>
        </div>
        
        <div className="bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/30 rounded-xl p-4 space-y-3">
          <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
            Ak CRM nenačítava emaily alebo kalendár pomocou <b>{googleAccount.emailAddress}</b>, kliknite na tlačidlo nižšie pre opravu alebo zmenu účtu.
          </p>
          
          <button
            onClick={handleReauthorize}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-800/40 text-amber-900 dark:text-amber-200 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
            Opraviť / Zmeniť prepojenie
          </button>
        </div>
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
      <span>Prepojiť Google účet</span>
    </button>
  );
}

export function GoogleSetupBanner() {
  return null;
}
