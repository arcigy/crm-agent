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
    messages,
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
    <div className="flex h-full bg-white dark:bg-black overflow-hidden relative">
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

      {/* Sidebar for Navigation */}
      <div className="relative z-10 border-r border-black/[0.02] dark:border-white/[0.02] bg-white dark:bg-zinc-950 w-[240px] flex-shrink-0">
        <LeadsSidebar 
          selectedTab={selectedTab} 
          onTabChange={setSelectedTab} 
          unreadCount={messages.filter((m: any) => !m.isRead).length}
        />
      </div>

      {/* Main Content Area: Switch between List and Detail */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10 bg-[#f8f7ff] dark:bg-black min-w-0">
        {selectedEmail ? (
          <EmailDetailView
            email={selectedEmail}
            onClose={() => setSelectedEmail(null)}
          />
        ) : (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <LeadsHeader
              isConnected={isConnected}
              loading={loading}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onRefresh={() => fetchMessages()}
              onConnect={handleConnect}
              totalCount={allItems.length}
            />

            {/* Message List */}
            <div className="flex-1 overflow-y-auto thin-scrollbar bg-white dark:bg-transparent">
              {loading && allItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <div className="w-10 h-10 border-[3px] border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin"></div>
                  <p className="text-indigo-500/60 font-black uppercase tracking-[0.2em] text-[10px]">
                    Synchronizujem...
                  </p>
                </div>
              ) : allItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-12">
                  <div className="w-20 h-20 bg-indigo-500/5 rounded-[2rem] flex items-center justify-center mb-6 border border-indigo-500/10 rotate-3">
                    <Mail className="w-8 h-8 text-indigo-500/40 -rotate-3" />
                  </div>
                  <h3 className="text-xl font-black text-foreground italic tracking-tight uppercase">
                    Všetko vybavené
                  </h3>
                  <p className="text-muted-foreground/60 text-sm font-bold mt-2">
                    Vaša schránka je momentálne prázdna.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-black/[0.03] dark:divide-white/[0.03]">
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
        )}
      </div>
    </div>
  );
}
