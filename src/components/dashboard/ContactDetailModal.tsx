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

  React.useEffect(() => {
    if (isOpen) {
      setEmailMode(false);
      setSmsMode(false);
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
          {emailMode ? (
            <EmailComposerView
              contact={contact}
              onClose={() => setEmailMode(false)}
            />
          ) : smsMode ? (
            <SmsQrView contact={contact} onClose={() => setSmsMode(false)} />
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}
