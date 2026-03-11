"use client";

import { PremiumLoader } from "@/components/ui/PremiumLoader";

export default function RootLoading() {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-[9999]">
      <PremiumLoader message="Načítavanie..." />
    </div>
  );
}
