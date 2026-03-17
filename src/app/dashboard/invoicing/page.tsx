"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { useInvoicingSettings } from "./hooks/useInvoicingSettings";
import { InvoicingHeader } from "./components/InvoicingHeader";
import { InvoicingProfileForm } from "./components/InvoicingProfileForm";
import { InvoicingRightColumn } from "./components/InvoicingRightColumn";

export default function InvoicingPage() {
  const { settings, isLoading, isSaving, handleSave, updateSetting } = useInvoicingSettings();

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 bg-transparent animate-in fade-in duration-500">
        <Loader2 className="w-10 h-10 text-violet-600 animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Načítavam...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-transparent overflow-hidden relative isolate">
      {/* 
        DASHBOARD SHELL ALIGNMENT
        - Removing all local backgrounds to allow 'marble-bg' from layout to show. 
      */}
      
      <InvoicingHeader 
        onSave={handleSave} 
        isSaveDisabled={isSaving} 
        isSaving={isSaving} 
      />

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 md:gap-4 overflow-hidden relative z-10 overscroll-none">
        {/* Main Section */}
        <div className="lg:col-span-8 flex flex-col min-h-0">
          <InvoicingProfileForm 
            settings={settings} 
            updateSetting={updateSetting} 
          />
        </div>

        {/* Sidebar Section */}
        <div className="lg:col-span-4 flex flex-col min-h-0">
          <InvoicingRightColumn settings={settings} />
        </div>
      </div>
    </div>
  );
}
