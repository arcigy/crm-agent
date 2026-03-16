"use client";

import * as React from "react";
import { ContactExtractionModal } from "@/components/dashboard/ContactExtractionModal";
import { QuickComposerModal } from "@/components/dashboard/QuickComposerModal";
import { ComposeModal } from "@/components/dashboard/ComposeModal";
import { TagManagementModal } from "./TagManagementModal";
import { agentCreateContact } from "@/app/actions/agent";
import { toast } from "sonner";

interface LeadsModalsProps {
  isContactModalOpen: boolean;
  setIsContactModalOpen: (open: boolean) => void;
  contactModalData: any;
  contactModalEmailBody: string;
  draftingEmail: any;
  setDraftingEmail: (email: any) => void;
  draftContent: string;
  setActiveActionId: (id: string | null) => void;
  isComposeOpen: boolean;
  setIsComposeOpen: (open: boolean) => void;
  draftData: any;
  setDraftData: (data: any) => void;
  setHasDraft: (has: boolean) => void;
  handleAddLocalSentMessage: (data: any) => void;
  setSelectedTab: (tab: string) => void;
  recentEmails: { email: string; name: string }[];
  isTagModalOpen: boolean;
  setIsTagModalOpen: (open: boolean) => void;
  tagModalEmail: any;
  gmailLabels: any[];
  messageTags: any;
  handleToggleTag: any;
  onRefresh: () => void;
  onCloseCompose: () => void;
}

export function LeadsModals({
  isContactModalOpen,
  setIsContactModalOpen,
  contactModalData,
  contactModalEmailBody,
  draftingEmail,
  setDraftingEmail,
  draftContent,
  setActiveActionId,
  isComposeOpen,
  setIsComposeOpen,
  draftData,
  setDraftData,
  setHasDraft,
  handleAddLocalSentMessage,
  setSelectedTab,
  recentEmails,
  isTagModalOpen,
  setIsTagModalOpen,
  tagModalEmail,
  gmailLabels,
  messageTags,
  handleToggleTag,
  onRefresh,
  onCloseCompose,
}: LeadsModalsProps) {
  return (
    <>
      {isContactModalOpen && contactModalData && (
        <ContactExtractionModal
          isOpen={isContactModalOpen}
          onClose={() => setIsContactModalOpen(false)}
          emailBody={contactModalEmailBody}
          extractedData={contactModalData}
          onConfirm={async () => {
            const toastId = toast.loading("Ukladám kontakt...");
            try {
              const res = await agentCreateContact(contactModalData);
              if (res.success) {
                toast.success("Kontakt úspešne vytvorený", { id: toastId });
              } else {
                toast.error(`Chyba: ${res.error}`, { id: toastId });
              }
            } catch (err) {
              console.error(err);
              toast.error("Nepodarilo sa uložiť kontakt", { id: toastId });
            }
          }}
        />
      )}

      {draftingEmail && (
        <QuickComposerModal
          isOpen={!!draftingEmail}
          onClose={() => setDraftingEmail(null)}
          initialContent={draftContent}
          recruitName={draftingEmail.from}
          onSend={async (text: string) => {
            console.log("Sending:", text);
            setDraftingEmail(null);
            setActiveActionId(null);
          }}
        />
      )}

      <ComposeModal
        isOpen={isComposeOpen}
        initialData={draftData}
        onClose={onCloseCompose}
        onDraftUpdate={(data) => setDraftData(data)}
        onMinimizeAction={() => setHasDraft(true)}
        onDraftDelete={() => {
          setHasDraft(false);
          setDraftData({ to: "", subject: "", body: "" });
        }}
        onSend={(data) => {
          console.log("Sending composed email:", data);
          handleAddLocalSentMessage(data);
          toast.success("Správa bola odoslaná do kategórie Odoslané!");
          onCloseCompose();
          setHasDraft(false);
          setDraftData({ to: "", subject: "", body: "" });
          setSelectedTab("sent");
        }}
        recentEmails={recentEmails}
      />

      <TagManagementModal
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        email={tagModalEmail}
        gmailLabels={gmailLabels}
        messageTags={messageTags}
        onToggleTag={handleToggleTag}
        onRefresh={onRefresh}
      />
    </>
  );
}
