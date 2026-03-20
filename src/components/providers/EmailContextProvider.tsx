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

  const setActiveEmail = React.useCallback((
    email: GmailMessage | null,
    thread: GmailMessage[] | null,
    contact: Lead | null
  ) => {
    setActiveEmailState(prev => {
      // Avoid re-renders if the same email is selected (or both are null)
      if (prev?.id === email?.id && (prev === null) === (email === null)) return prev;
      return email;
    });
    
    setActiveThread(prev => {
      // For threads, comparison is trickier, but we can check the ID of the first message or length
      // Handle cases where prev or thread might be null
      if (prev === null && thread === null) return prev;
      if (prev && thread && prev.length === thread.length && prev[0]?.id === thread[0]?.id) return prev;
      return thread;
    });
    
    setActiveContact(prev => {
      // Avoid re-renders if the same contact is selected (or both are null)
      if (prev?.id === contact?.id && (prev === null) === (contact === null)) return prev;
      return contact;
    });
  }, []);

  const clearEmailContext = React.useCallback(() => {
    setActiveEmailState(null);
    setActiveThread(null);
    setActiveContact(null);
  }, []);

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
