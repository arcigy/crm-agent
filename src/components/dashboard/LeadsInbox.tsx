"use client";

import * as React from "react";
import { ContactExtractionModal } from "@/components/dashboard/ContactExtractionModal";
import { QuickComposerModal } from "@/components/dashboard/QuickComposerModal";
import { ComposeModal } from "@/components/dashboard/ComposeModal";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { agentCreateContact } from "@/app/actions/agent";

// New Refactored Components
import { useLeadsInbox } from "@/hooks/useLeadsInbox";
import { EmailDetailView } from "./leads/EmailDetailView";
import { LeadsSidebar } from "./leads/LeadsSidebar";
import { LeadsHeader } from "./leads/LeadsHeader";
import { LeadsListItem } from "./leads/LeadsListItem";
import { TagManagementModal } from "./leads/TagManagementModal";
import { GmailMessage } from "@/types/gmail";

interface LeadsInboxProps {
  initialMessages?: GmailMessage[];
}

export function LeadsInbox({ initialMessages = [] }: LeadsInboxProps) {
  const {
    messages,
    loading,
    isConnected,
    searchQuery,
    onSearchChange: setSearchQuery,
    onRefresh: fetchMessages,
    onConnect: handleConnect,
    totalCount,
    currentPage,
    onPageChange: setCurrentPage,
    totalPages,
    allItems,
    paginatedItems,
    selectedEmail,
    setSelectedEmail,
    selectedTab,
    setSelectedTab,
    isContactModalOpen,
    setIsContactModalOpen,
    contactModalData,
    contactModalEmailBody,
    activeActionId,
    setActiveActionId,
    draftingEmail,
    setDraftingEmail,
    draftContent,
    setIsGeneratingDraft,
    isGeneratingDraft,
    customCommandMode,
    setCustomCommandMode,
    customPrompt,
    setCustomPrompt,
    isComposeOpen,
    setIsComposeOpen,
    hasDraft,
    setHasDraft,
    draftData,
    setDraftData,
    handleDeleteMessage,
    handleArchiveMessage,
    handleSpamMessage,
    handleMarkUnreadMessage,
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    handleBulkArchive,
    handleBulkTag,
    handleToggleTag,
    handleRemoveCustomTag,
    handleRenameCustomTag,
    handleEmptyTrash,
    analyzeEmail,
    handleOpenEmail,
    handleToggleStar,
    handleManualAnalyze,
    handleToggleAction,
    handleDraftReply,
    handleExecuteCustomCommand,
    handleSaveContact,
    customTags,
    setCustomTags,
    tagColors,
    setTagColors,
    messageTags,
    isTagModalOpen,
    setIsTagModalOpen,
    tagModalEmail,
    setTagModalEmail,
    handleAddLocalSentMessage,
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

  // Compute known emails for autocomplete from messages
  const recentEmails = React.useMemo(() => {
    const emailMap = new Map<string, string>();
    messages.forEach(m => {
      if (!m.from) return;
      
      // Try to parse "Name <email@example.com>"
      const match = m.from.match(/^(.*?)\s*<(.+?)>$/);
      if (match) {
        const name = match[1].replace(/"/g, '').trim();
        const email = match[2].toLowerCase().trim();
        // Keep the most descriptive name if multiple exist for same email
        if (!emailMap.has(email) || (name && !emailMap.get(email))) {
          emailMap.set(email, name);
        }
      } else if (m.from.includes('@')) {
        const email = m.from.toLowerCase().trim();
        if (!emailMap.has(email)) {
          emailMap.set(email, '');
        }
      }
    });

    return Array.from(emailMap.entries()).map(([email, name]) => ({ email, name }));
  }, [messages]);

  return (
    <div className="flex h-full bg-[#f8f7ff] dark:bg-black overflow-hidden relative">
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

      {/* General Compose Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        initialData={draftData}
        onClose={() => setIsComposeOpen(false)}
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
          setIsComposeOpen(false);
          setHasDraft(false);
          setDraftData({ to: "", subject: "", body: "" });
          setSelectedTab("sent");
        }}
        recentEmails={recentEmails}
      />

      {/* Tag Management Modal */}
      <TagManagementModal
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        email={tagModalEmail}
        customTags={customTags}
        tagColors={tagColors}
        messageTags={messageTags}
        onAddTag={(tag, color) => {
          setCustomTags(prev => [...new Set([...prev, tag])].sort());
          setTagColors(prev => ({ ...prev, [tag]: color || "#8b5cf6" }));
        }}
        onToggleTag={handleToggleTag}
        onRemoveCustomTag={handleRemoveCustomTag}
        onRenameTag={handleRenameCustomTag}
        onUpdateTagColor={(tag, color) => setTagColors(prev => ({ ...prev, [tag]: color }))}
      />

      {/* Sidebar for Navigation */}
      <div className="relative z-10 bg-white dark:bg-zinc-950 w-[240px] flex-shrink-0">
        <LeadsSidebar 
          selectedTab={selectedTab} 
          onTabChange={(tab) => {
            setSelectedTab(tab);
            setSelectedEmail(null);
            setCurrentPage(1);
          }} 
          unreadCount={messages.filter((m: any) => !m.isRead).length}
          draftCount={hasDraft ? 1 : 0}
          onCompose={() => setIsComposeOpen(true)}
          customTags={customTags}
          tagColors={tagColors}
          onManageTags={() => {
            setTagModalEmail(null);
            setIsTagModalOpen(true);
          }}
        />
      </div>

      {/* Main Content Area: Switch between List and Detail */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10 bg-transparent min-w-0">
        {selectedEmail ? (
          <EmailDetailView
            email={selectedEmail}
            onClose={() => setSelectedEmail(null)}
            onDeleteMessage={(email) => handleDeleteMessage(null, email)}
            onArchive={handleArchiveMessage}
            onSpam={handleSpamMessage}
            onMarkUnread={handleMarkUnreadMessage}
            onToggleStar={handleToggleStar}
            onReply={(email) => {
              const formattedDate = email.date ? new Date(email.date).toLocaleString('sk-SK') : '';
              setDraftData({
                to: email.from,
                subject: email.subject.startsWith("Re:") ? email.subject : `Re: ${email.subject}`,
                body: `\n\n\nDňa ${formattedDate} ${email.from} napísal(a):\n> ${email.snippet.replace(/\n/g, '\n> ')}`
              });
              setIsComposeOpen(true);
            }}
            onForward={(email) => {
              const formattedDate = email.date ? new Date(email.date).toLocaleString('sk-SK') : '';
              setDraftData({
                to: "",
                subject: email.subject.startsWith("Fwd:") ? email.subject : `Fwd: ${email.subject}`,
                body: `\n\n\n---------- Preposlaná správa ----------\nOd: ${email.from}\nDátum: ${formattedDate}\nPredmet: ${email.subject}\n\n${email.snippet}`
              });
              setIsComposeOpen(true);
            }}
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
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              selectedCount={selectedIds.size}
              totalVisibleCount={paginatedItems.filter(item => item.itemType === "email").length}
              onToggleSelectAll={() => {
                const emailsToSelect = paginatedItems.filter(item => item.itemType === "email").map((i: any) => i.id);
                selectAll(emailsToSelect);
              }}
              onClearSelection={clearSelection}
              onBulkArchive={() => handleBulkArchive(Array.from(selectedIds))}
              onBulkTag={(tag) => handleBulkTag(Array.from(selectedIds), tag)}
              onEmptyTrash={handleEmptyTrash}
              currentTab={selectedTab}
            />

            {/* Message List Floating Container - Full Width Compact */}
            <div className="flex-1 overflow-y-auto px-4 pb-8 thin-scrollbar relative scroll-smooth bg-transparent dark:bg-black/50 transform-gpu">
              {/* Sticky Top Fade Mask */}
              <div className="sticky top-0 left-0 right-0 h-8 bg-gradient-to-b from-[#f8f7ff] dark:from-black via-[#f8f7ff]/80 dark:via-black/80 to-transparent z-20 pointer-events-none" />
              
              <div className="bg-[#f4f7fb] dark:bg-zinc-900/50 rounded-[2rem] shadow-[0_20px_40px_-8px_rgba(0,0,0,0.03)] overflow-hidden transition-all duration-700 relative">
                {loading && allItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-10 h-10 border-[3px] border-violet-500/10 border-t-violet-500 rounded-full animate-spin"></div>
                  </div>
                ) : allItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center px-12">
                    <div className="w-16 h-16 bg-violet-500/5 rounded-2xl flex items-center justify-center mb-6 border border-violet-500/10 rotate-3">
                      <Mail className="w-6 h-6 text-violet-500/40 -rotate-3" />
                    </div>
                    <h3 className="text-lg font-black text-foreground italic uppercase">Všetko vybavené</h3>
                    <p className="text-muted-foreground/60 text-sm font-bold mt-2">Pusti si kávu, dnes už nič neprišlo.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-black/[0.02] dark:divide-white/[0.02]">
                    {paginatedItems.map((item) => (
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
                        onToggleStar={handleToggleStar}
                        onToggleAction={handleToggleAction}
                        onManualAnalyze={handleManualAnalyze}
                        onSaveContact={handleSaveContact}
                        onDraftReply={handleDraftReply}
                        onExecuteCustomCommand={handleExecuteCustomCommand}
                        onDeleteMessage={handleDeleteMessage}
                        isSelected={selectedIds.has((item as any).id)}
                        onToggleSelection={(e, id) => toggleSelection(id)}
                        onToggleTag={(e, msg) => {
                          setTagModalEmail(msg);
                          setIsTagModalOpen(true);
                        }}
                        tags={messageTags[(item as any).id] || []}
                        tagColors={tagColors}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
