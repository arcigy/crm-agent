"use client";

import { Toaster as Sonner } from "sonner";
import { useTheme } from "next-themes";

export function PremiumToaster() {
  const { theme = "dark" } = useTheme();

  return (
    <Sonner
      theme={theme as "light" | "dark" | "system"}
      className="toaster group"
      position="top-right"
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:bg-zinc-950/80 group-[.toaster]:backdrop-blur-xl group-[.toaster]:text-zinc-50 group-[.toaster]:border-violet-500/20 group-[.toaster]:shadow-[0_20px_50px_rgba(0,0,0,0.5)] group-[.toaster]:rounded-2xl group-[.toaster]:p-4 group-[.toaster]:font-sans group-[.toaster]:border group-[.toaster]:flex group-[.toaster]:items-center group-[.toaster]:gap-3 group-[.toaster]:min-w-[320px]",
          description: "group-[.toast]:text-zinc-400 group-[.toast]:text-[12px] group-[.toast]:font-medium",
          actionButton: "group-[.toast]:bg-violet-600 group-[.toast]:text-white group-[.toast]:font-black group-[.toast]:text-[10px] group-[.toast]:uppercase group-[.toast]:tracking-widest group-[.toast]:rounded-xl group-[.toast]:px-4 group-[.toast]:py-2 group-[.toast]:hover:bg-violet-500 group-[.toast]:transition-all",
          cancelButton: "group-[.toast]:bg-zinc-800 group-[.toast]:text-zinc-400 group-[.toast]:font-black group-[.toast]:text-[10px] group-[.toast]:uppercase group-[.toast]:tracking-widest group-[.toast]:rounded-xl group-[.toast]:px-4 group-[.toast]:py-2 group-[.toast]:hover:bg-zinc-700 group-[.toast]:transition-all",
          success: "group-[.toaster]:border-emerald-500/30 group-[.toaster]:bg-emerald-950/20",
          error: "group-[.toaster]:border-red-500/30 group-[.toaster]:bg-red-950/20",
          info: "group-[.toaster]:border-violet-500/30 group-[.toaster]:bg-violet-950/20",
          warning: "group-[.toaster]:border-amber-500/30 group-[.toaster]:bg-amber-950/20",
          title: "group-[.toast]:text-[14px] group-[.toast]:font-black group-[.toast]:tracking-tight group-[.toast]:italic group-[.toast]:uppercase group-[.toast]:text-violet-100",
        },
      }}
    />
  );
}
