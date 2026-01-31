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
import { ContactInvoices } from "./contacts/ContactInvoices";
import { ContactDocuments } from "./contacts/ContactDocuments";
import { ContactEvents } from "./contacts/ContactEvents";
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
    "overview" | "tasks" | "documents" | "invoices" | "events"
  >("overview");
  const [detailedContact, setDetailedContact] = React.useState<Lead | null>(
    null,
  );

  React.useEffect(() => {
    if (isOpen && contact) {
      setEmailMode(false);
      setSmsMode(false);
      setActiveTab("overview");
      setDetailedContact(contact);

      // Robust fetch: Ensure we have all projects, deals, and activities
      // We do this even if 'contact' already has some data to be sure it's fresh
      import("@/app/actions/contacts").then(({ getContact }) => {
        getContact(contact.id).then((res) => {
          if (res.success && res.data) {
            setDetailedContact(res.data as any);
          }
        });
      });
    }
  }, [isOpen, contact]);

  if (!isOpen || !contact) return null;

  const currentContact = detailedContact || contact;

  return (
    <div className="fixed inset-0 z-[270] flex items-center justify-center p-2 sm:p-6 animate-in fade-in duration-300">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="bg-background w-full max-w-[95vw] sm:max-w-6xl h-[95vh] sm:rounded-[3rem] shadow-2xl relative flex overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 border border-border dark:border-white/10 transition-colors duration-300">
        <ContactProfileSidebar
          contact={currentContact}
          onClose={onClose}
          setEmailMode={setEmailMode}
          setSmsMode={setSmsMode}
          emailMode={emailMode}
        />

        <div className="flex-1 flex flex-col bg-background overflow-hidden relative transition-colors">
          {/* Main Content Header / Tabs */}
          <div className="h-16 border-b border-border flex items-center justify-between px-8 bg-background shrink-0 transition-colors">
            {/* ... tabs omitted for space ... */}
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
              <button
                onClick={() => {
                  setActiveTab("events");
                  setEmailMode(false);
                  setSmsMode(false);
                }}
                className={`text-sm font-bold transition-all border-b-2 pb-5 pt-5 ${activeTab === "events" ? "text-foreground border-primary" : "text-zinc-500 border-transparent hover:text-foreground"}`}
              >
                Udalosti
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
                contact={currentContact}
                onClose={() => setEmailMode(false)}
              />
            ) : smsMode ? (
              <SmsQrView
                contact={currentContact}
                onClose={() => setSmsMode(false)}
              />
            ) : activeTab === "overview" ? (
              <div className="h-full overflow-y-auto">
                <ContactOverview contact={currentContact} onClose={onClose}>
                  <div className="col-span-12 lg:col-span-8 space-y-6">
                    <ContactProjects contact={currentContact} />
                    <ContactActivity contact={currentContact} />
                  </div>
                  <div className="col-span-12 lg:col-span-4 space-y-6">
                    <ContactDealsNotes contact={currentContact} />
                  </div>
                </ContactOverview>
              </div>
            ) : activeTab === "tasks" ? (
              <div className="h-full overflow-y-auto p-8 bg-zinc-50/10 transition-all">
                <h3 className="text-sm font-black uppercase text-zinc-400 mb-6 tracking-widest">
                  Prepojené Úlohy
                </h3>
                <RelatedTasks entityId={currentContact.id} type="contact" />
              </div>
            ) : activeTab === "documents" ? (
              <div className="h-full overflow-y-auto">
                <ContactDocuments contact={currentContact} />
              </div>
            ) : activeTab === "invoices" ? (
              <div className="h-full overflow-y-auto bg-zinc-50/10 transition-all">
                <ContactInvoices contact={currentContact} />
              </div>
            ) : activeTab === "events" ? (
              <div className="h-full overflow-y-auto bg-zinc-50/10 transition-all">
                <ContactEvents contact={currentContact} />
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
