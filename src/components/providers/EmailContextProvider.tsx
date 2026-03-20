"use client";

import React, { createContext, useContext, useState } from "react";
import { GmailMessage } from "@/types/gmail";
import { Lead } from "@/types/contact";

interface EmailContextType {
  activeEmail: GmailMessage | null;
  activeThread: GmailMessage[] | null;
  activeContact: Lead | null;
  setActiveEmail: (email: GmailMessage | null, thread: GmailMessage[] | null, contact: Lead | null) => void;
  clearEmailContext: () => void;
}

const EmailContext = createContext<EmailContextType | undefined>(undefined);

export function useEmailContext() {
  const context = useContext(EmailContext);
  if (!context) {
    throw new Error("useEmailContext must be used within an EmailContextProvider");
  }
  return context;
}

export function EmailContextProvider({ children }: { children: React.ReactNode }) {
  const [activeEmail, setActiveEmailState] = useState<GmailMessage | null>(null);
  const [activeThread, setActiveThread] = useState<GmailMessage[] | null>(null);
  const [activeContact, setActiveContact] = useState<Lead | null>(null);

  const setActiveEmail = (
    email: GmailMessage | null,
    thread: GmailMessage[] | null,
    contact: Lead | null
  ) => {
    setActiveEmailState(email);
    setActiveThread(thread);
    setActiveContact(contact);
  };

  const clearEmailContext = () => {
    setActiveEmailState(null);
    setActiveThread(null);
    setActiveContact(null);
  };

  return (
    <EmailContext.Provider 
      value={{ 
        activeEmail, 
        activeThread, 
        activeContact, 
        setActiveEmail, 
        clearEmailContext 
      }}
    >
      {children}
    </EmailContext.Provider>
  );
}
