"use client";

import * as React from "react";
import { Lead } from "@/types/contact";
import { ContactProfileSidebar } from "./contacts/ContactProfileSidebar";
import { EmailComposerView } from "./contacts/EmailComposerView";
import { SmsQrView } from "./contacts/SmsQrView";
import { ContactOverview } from "./contacts/ContactOverview";
import { ContactProjects } from "./contacts/ContactProjects";
import { ContactActivity } from "./contacts/ContactActivity";
import { ContactDealsNotes } from "./contacts/ContactDealsNotes";
import { ContactDriveFiles } from "./contacts/ContactDriveFiles";
import { ContactInvoices } from "./contacts/ContactInvoices";
import { RelatedTasks } from "./RelatedTasks";
import { X } from "lucide-react";

interface ContactDetailModalProps {
  contact: Lead | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ContactDetailModal({
  contact,
  isOpen,
  onClose,
}: ContactDetailModalProps) {
  const [emailMode, setEmailMode] = React.useState(false);
  const [smsMode, setSmsMode] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<
    "overview" | "tasks" | "documents" | "invoices"
  >("overview");

  React.useEffect(() => {
    if (isOpen) {
      setEmailMode(false);
      setSmsMode(false);
      setActiveTab("overview");
    }
  }, [isOpen]);

  if (!isOpen || !contact) return null;

  return (
    <div className="fixed inset-0 z-[270] flex items-center justify-center p-2 sm:p-6 animate-in fade-in duration-300">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="bg-background w-full max-w-[95vw] sm:max-w-6xl h-[95vh] sm:rounded-[3rem] shadow-2xl relative flex overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 border border-border dark:border-white/10 transition-colors duration-300">
        <ContactProfileSidebar
          contact={contact}
          onClose={onClose}
          setEmailMode={setEmailMode}
          setSmsMode={setSmsMode}
          emailMode={emailMode}
        />

        <div className="flex-1 flex flex-col bg-background overflow-hidden relative transition-colors">
          {/* Main Content Header / Tabs */}
          <div className="h-16 border-b border-border flex items-center justify-between px-8 bg-background shrink-0 transition-colors">
            <div className="flex items-center gap-6">
              <button
                onClick={() => {
                  setActiveTab("overview");
                  setEmailMode(false);
                  setSmsMode(false);
                }}
                className={`text-sm font-bold transition-all border-b-2 pb-5 pt-5 ${activeTab === "overview" && !emailMode && !smsMode ? "text-foreground border-primary" : "text-zinc-500 border-transparent hover:text-foreground"}`}
              >
                Prehľad
              </button>
              <button
                onClick={() => {
                  setActiveTab("tasks");
                  setEmailMode(false);
                  setSmsMode(false);
                }}
                className={`text-sm font-bold transition-all border-b-2 pb-5 pt-5 ${activeTab === "tasks" ? "text-foreground border-primary" : "text-zinc-500 border-transparent hover:text-foreground"}`}
              >
                Úlohy
              </button>
              <button
                onClick={() => {
                  setActiveTab("documents");
                  setEmailMode(false);
                  setSmsMode(false);
                }}
                className={`text-sm font-bold transition-all border-b-2 pb-5 pt-5 ${activeTab === "documents" ? "text-foreground border-primary" : "text-zinc-500 border-transparent hover:text-foreground"}`}
              >
                Dokumenty
              </button>
              <button
                onClick={() => {
                  setActiveTab("invoices");
                  setEmailMode(false);
                  setSmsMode(false);
                }}
                className={`text-sm font-bold transition-all border-b-2 pb-5 pt-5 ${activeTab === "invoices" ? "text-foreground border-primary" : "text-zinc-500 border-transparent hover:text-foreground"}`}
              >
                Faktúry
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden relative">
            {emailMode ? (
              <EmailComposerView
                contact={contact}
                onClose={() => setEmailMode(false)}
              />
            ) : smsMode ? (
              <SmsQrView contact={contact} onClose={() => setSmsMode(false)} />
            ) : activeTab === "overview" ? (
              <div className="h-full overflow-y-auto">
                <ContactOverview contact={contact} onClose={onClose}>
                  <div className="col-span-12 lg:col-span-8 space-y-6">
                    <ContactProjects contact={contact} />
                    <ContactActivity contact={contact} />
                  </div>
                  <div className="col-span-12 lg:col-span-4 space-y-6">
                    <ContactDealsNotes contact={contact} />
                    <ContactDriveFiles contact={contact} />
                  </div>
                </ContactOverview>
              </div>
            ) : activeTab === "tasks" ? (
              <div className="h-full overflow-y-auto p-8 bg-zinc-50/10 transition-all">
                <h3 className="text-sm font-black uppercase text-zinc-400 mb-6 tracking-widest">
                  Prepojené Úlohy
                </h3>
                <RelatedTasks entityId={contact.id} type="contact" />
              </div>
            ) : activeTab === "invoices" ? (
              <div className="h-full overflow-y-auto bg-zinc-50/10 transition-all">
                <ContactInvoices contact={contact} />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-zinc-400 opacity-40">
                <p className="text-sm font-black uppercase tracking-widest">
                  Pripravujeme...
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
