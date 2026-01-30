"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { ContactDetailModal } from "@/components/dashboard/ContactDetailModal";
import { getContact } from "@/app/actions/contacts";
import { toast } from "sonner";
import { Lead } from "@/types/contact";

interface ContactPreviewContextType {
  openContact: (id: string | number) => void;
  closeContact: () => void;
}

const ContactPreviewContext = createContext<
  ContactPreviewContextType | undefined
>(undefined);

export function useContactPreview() {
  const context = useContext(ContactPreviewContext);
  if (!context) {
    throw new Error(
      "useContactPreview must be used within a ContactPreviewProvider",
    );
  }
  return context;
}

export function ContactPreviewProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [contactId, setContactId] = useState<string | number | null>(null);
  const [contact, setContact] = useState<Lead | null>(null);

  const openContact = (id: string | number) => {
    setContactId(id);
    setIsOpen(true);
  };

  const closeContact = () => {
    setIsOpen(false);
    setTimeout(() => {
      setContactId(null);
      setContact(null);
    }, 300);
  };

  useEffect(() => {
    if (contactId && isOpen) {
      // Optimistic / Loading state handled by modal possibly being empty or skeleton?
      // ContactDetailModal checks `if (!contact) return null;`
      // So it won't show until loaded.
      // We might want to show a spinner.
      // For now, let's just fetch given the previous modal likely handles loading gracefully or we accept a slight delay.

      getContact(contactId).then((res) => {
        if (res.success) {
          setContact(res.data as Lead);
        } else {
          toast.error("Contact not found");
          closeContact();
        }
      });
    }
  }, [contactId, isOpen]);

  return (
    <ContactPreviewContext.Provider value={{ openContact, closeContact }}>
      {children}
      <ContactDetailModal
        contact={contact}
        isOpen={isOpen}
        onClose={closeContact}
      />
    </ContactPreviewContext.Provider>
  );
}
