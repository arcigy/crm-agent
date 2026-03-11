"use client";

import { PremiumLoader } from "@/components/ui/PremiumLoader";

export default function DashboardLoading() {
  return (
    <div className="w-full h-[80vh] flex items-center justify-center p-10 animate-in fade-in duration-500">
      <PremiumLoader message="Načítavanie..." />
    </div>
  );
}
