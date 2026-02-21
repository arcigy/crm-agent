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
    <div className="flex h-[calc(100vh-80px)] gap-0 bg-transparent rounded-[2.5rem] overflow-hidden relative border border-black/5 dark:border-white/[0.05] shadow-2xl mx-4 mb-4">
      {/* Background Image / Glow for CRM Indigo Vibe */}
      <div className="absolute inset-0 z-0 opacity-40 dark:opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-violet-500/5 dark:from-indigo-500/10" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px]" />
      </div>

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
        <div className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-xl flex flex-col animate-in slide-in-from-right duration-300">
          <EmailDetailView
            email={selectedEmail}
            onClose={() => setSelectedEmail(null)}
          />
        </div>
      )}

      {/* Sidebar for Navigation */}
      <div className="relative z-10 border-r border-black/5 bg-white/10 backdrop-blur-sm">
        <LeadsSidebar 
          selectedTab={selectedTab} 
          onTabChange={setSelectedTab} 
          unreadCount={messages.filter((m: any) => !m.isRead).length}
        />
      </div>

      {/* Main Inbox View */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10 bg-white/30 dark:bg-zinc-950/90 backdrop-blur-xl">
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
        <div className="flex-1 overflow-y-auto thin-scrollbar relative z-10">
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
            <div className="divide-y divide-black/5 dark:divide-white/5">
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
