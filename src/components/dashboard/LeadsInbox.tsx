"use client";

import * as React from "react";
import { ContactExtractionModal } from "@/components/dashboard/ContactExtractionModal";
import { QuickComposerModal } from "@/components/dashboard/QuickComposerModal";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { agentCreateContact } from "@/app/actions/agent";

// New Refactored Components
import { useLeadsInbox } from "@/hooks/useLeadsInbox";
import { EmailDetailView } from "./leads/EmailDetailView";
import { LeadsSidebar } from "./leads/LeadsSidebar";
import { LeadsHeader } from "./leads/LeadsHeader";
import { LeadsListItem } from "./leads/LeadsListItem";
import { GmailMessage } from "@/types/gmail";

interface LeadsInboxProps {
  initialMessages?: GmailMessage[];
}

export function LeadsInbox({ initialMessages = [] }: LeadsInboxProps) {
  const {
    allItems,
    loading,
    isConnected,
    searchQuery,
    setSearchQuery,
    selectedTab,
    setSelectedTab,
    selectedEmail,
    setSelectedEmail,
    isContactModalOpen,
    setIsContactModalOpen,
    contactModalData,
    contactModalEmailBody,
    activeActionId,
    setActiveActionId,
    draftingEmail,
    setDraftingEmail,
    draftContent,
    isGeneratingDraft,
    customCommandMode,
    setCustomCommandMode,
    customPrompt,
    setCustomPrompt,
    fetchMessages,
    handleConnect,
    handleOpenEmail,
    handleManualAnalyze,
    handleToggleAction,
    handleDraftReply,
    handleExecuteCustomCommand,
    handleSaveContact,
    analyzeEmail,
  } = useLeadsInbox(initialMessages);

  const analyzedIds = React.useRef<Set<string>>(new Set());

  // Effect to trigger analysis for unclassified emails
  React.useEffect(() => {
    allItems.forEach((item) => {
      if (item.itemType === "email") {
        const msg = item as GmailMessage;
        if (
          !msg.classification &&
          !msg.isAnalyzing &&
          !analyzedIds.current.has(msg.id)
        ) {
          analyzedIds.current.add(msg.id);
          analyzeEmail(msg);
        }
      }
    });
  }, [allItems, analyzeEmail]);

  // Initial fetch and periodic sync
  React.useEffect(() => {
    fetchMessages();
    const interval = setInterval(() => fetchMessages(true), 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-full gap-0 bg-background rounded-none relative transition-colors duration-300">
      {/* Contact Extraction Modal */}
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

      {/* Quick Composer Modal */}
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

      {/* Overlay Email Detail View */}
      {selectedEmail && (
        <div className="fixed inset-0 z-[50] bg-background flex flex-col animate-in slide-in-from-right duration-300">
          <EmailDetailView
            email={selectedEmail}
            onClose={() => setSelectedEmail(null)}
          />
        </div>
      )}

      {/* Sidebar for Navigation */}
      <LeadsSidebar selectedTab={selectedTab} onTabChange={setSelectedTab} />

      {/* Main Inbox View */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-background transition-colors duration-300">
        <LeadsHeader
          isConnected={isConnected}
          loading={loading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onRefresh={() => fetchMessages()}
          onConnect={handleConnect}
        />

        {/* Message List */}
        <div className="flex-1 overflow-y-auto">
          {loading && allItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="w-10 h-10 border-4 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                Synchronizujem...
              </p>
            </div>
          ) : allItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-12">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                <Mail className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="text-xl font-black text-foreground">
                Žiadne správy
              </h3>
              <p className="text-gray-500 font-medium mt-2">
                Všetko vybavené! Čas na kávu.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {allItems.map((item) => (
                <LeadsListItem
                  key={(item as any).id}
                  item={item}
                  isActionOpen={activeActionId === (item as any).id}
                  isGeneratingDraft={isGeneratingDraft}
                  customCommandMode={customCommandMode}
                  customPrompt={customPrompt}
                  setCustomPrompt={setCustomPrompt}
                  setCustomCommandMode={setCustomCommandMode}
                  onOpenEmail={handleOpenEmail}
                  onToggleAction={handleToggleAction}
                  onManualAnalyze={handleManualAnalyze}
                  onSaveContact={handleSaveContact}
                  onDraftReply={handleDraftReply}
                  onExecuteCustomCommand={handleExecuteCustomCommand}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
