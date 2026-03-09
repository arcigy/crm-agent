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
    } else if (!isOpen) {
      setDetailedContact(null);
    }
  }, [isOpen, contact]);

  if (!isOpen || !contact) return null;

  const currentContact = (detailedContact && String(detailedContact.id) === String(contact.id)) 
    ? detailedContact 
    : contact;

  return (
    <div className="fixed inset-0 z-[270] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-500">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="bg-[#0a0a0c] w-full max-w-7xl h-[90vh] sm:rounded-[2.5rem] shadow-[0_0_100px_rgba(139,92,246,0.15)] relative flex overflow-hidden animate-in zoom-in-95 duration-500 border border-white/10">
        <ContactProfileSidebar
          contact={currentContact}
          onClose={onClose}
          setEmailMode={setEmailMode}
          setSmsMode={setSmsMode}
          emailMode={emailMode}
        />

        <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
          {/* Main Content Header / Neon Tabs */}
          <div className="h-16 border-b border-white/5 flex items-center justify-between px-10 bg-black/20 shrink-0">
            <div className="flex items-center gap-10 h-full">
              <button
                onClick={() => {
                  setActiveTab("overview");
                  setEmailMode(false);
                  setSmsMode(false);
                }}
                className={`text-[13px] font-semibold tracking-wide transition-all h-full relative group ${activeTab === "overview" && !emailMode && !smsMode ? "text-white" : "text-zinc-500 hover:text-white"}`}
              >
                Prehľad
                {activeTab === "overview" && !emailMode && !smsMode && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-violet-500 shadow-[0_0_15px_#8b5cf6]" />
                )}
              </button>
              <button
                onClick={() => {
                  setActiveTab("tasks");
                  setEmailMode(false);
                  setSmsMode(false);
                }}
                className={`text-[13px] font-semibold tracking-wide transition-all h-full relative group ${activeTab === "tasks" ? "text-white" : "text-zinc-500 hover:text-white"}`}
              >
                Úlohy
                {activeTab === "tasks" && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-violet-500 shadow-[0_0_15px_#8b5cf6]" />
                )}
              </button>
              <button
                onClick={() => {
                  setActiveTab("documents");
                  setEmailMode(false);
                  setSmsMode(false);
                }}
                className={`text-[13px] font-semibold tracking-wide transition-all h-full relative group ${activeTab === "documents" ? "text-white" : "text-zinc-500 hover:text-white"}`}
              >
                Súbory
                {activeTab === "documents" && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-violet-500 shadow-[0_0_15px_#8b5cf6]" />
                )}
              </button>
              <button
                onClick={() => {
                  setActiveTab("invoices");
                  setEmailMode(false);
                  setSmsMode(false);
                }}
                className={`text-[13px] font-semibold tracking-wide transition-all h-full relative group ${activeTab === "invoices" ? "text-white" : "text-zinc-500 hover:text-white"}`}
              >
                Faktúry
                {activeTab === "invoices" && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-violet-500 shadow-[0_0_15px_#8b5cf6]" />
                )}
              </button>
              <button
                onClick={() => {
                  setActiveTab("events");
                  setEmailMode(false);
                  setSmsMode(false);
                }}
                className={`text-[13px] font-semibold tracking-wide transition-all h-full relative group ${activeTab === "events" ? "text-white" : "text-zinc-500 hover:text-white"}`}
              >
                Udalosti
                {activeTab === "events" && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-violet-500 shadow-[0_0_15px_#8b5cf6]" />
                )}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/5 rounded-2xl transition-all border border-white/5"
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
              <div className="h-full overflow-hidden">
                <ContactOverview contact={currentContact} onClose={onClose}>
                  <div className="col-span-12 lg:col-span-8 space-y-4">
                    <ContactProjects contact={currentContact} />
                    <ContactActivity contact={currentContact} />
                  </div>
                  <div className="col-span-12 lg:col-span-4">
                    <ContactDealsNotes contact={currentContact} />
                  </div>
                </ContactOverview>
              </div>
            ) : activeTab === "tasks" ? (
              <div className="h-full overflow-y-auto p-8 bg-zinc-50/10 transition-all thin-scrollbar">
                <h3 className="text-sm font-black uppercase text-zinc-400 mb-6 tracking-widest">
                  Prepojené Úlohy
                </h3>
                <RelatedTasks entityId={currentContact.id} type="contact" />
              </div>
            ) : activeTab === "documents" ? (
              <div className="h-full overflow-y-auto thin-scrollbar">
                <ContactDocuments contact={currentContact} />
              </div>
            ) : activeTab === "invoices" ? (
              <div className="h-full overflow-y-auto bg-zinc-50/10 transition-all thin-scrollbar">
                <ContactInvoices contact={currentContact} />
              </div>
            ) : activeTab === "events" ? (
              <div className="h-full overflow-y-auto bg-zinc-50/10 transition-all thin-scrollbar">
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
