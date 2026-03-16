"use client";

import * as React from "react";
import { Mail } from "lucide-react";
import { LeadsHeader } from "./LeadsHeader";
import { LeadsListItem } from "./LeadsListItem";
import { GmailMessage } from "@/types/gmail";

interface LeadsListContentProps {
  loading: boolean;
  isConnected: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onRefresh: () => void;
  onConnect: () => void;
  allItems: any[];
  paginatedItems: any[];
  currentPage: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  selectedIds: Set<string>;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  handleBulkArchive: (ids: string[]) => void;
  handleBulkTag: (ids: string[], tag: string) => void;
  handleEmptyTrash: () => void;
  selectedTab: string;
  activeActionId: string | null;
  isGeneratingDraft: boolean;
  customCommandMode: boolean;
  customPrompt: string;
  setCustomPrompt: (p: string) => void;
  setCustomCommandMode: (m: boolean) => void;
  handleOpenEmail: (email: GmailMessage) => void;
  handleToggleStar: (e: React.MouseEvent, email: GmailMessage) => void;
  handleToggleAction: (e: React.MouseEvent, id: string) => void;
  handleManualAnalyze: (e: React.MouseEvent, email: GmailMessage) => void;
  handleSaveContact: (e: React.MouseEvent, email: GmailMessage) => void;
  handleDraftReply: (email: GmailMessage) => void;
  handleExecuteCustomCommand: (email: GmailMessage, prompt: string) => void;
  handleDeleteMessage: (e: React.MouseEvent, email: GmailMessage) => void;
  handleRestoreMessage: (e: React.MouseEvent, email: GmailMessage) => void;
  toggleSelection: (id: string) => void;
  setIsTagModalOpen: (open: boolean) => void;
  setTagModalEmail: (email: GmailMessage) => void;
  messageTags: Record<string, string[]>;
  gmailLabels?: any[];
  isBuffering: boolean;
}

export function LeadsListContent({
  loading,
  isConnected,
  searchQuery,
  onSearchChange,
  onRefresh,
  onConnect,
  allItems,
  paginatedItems,
  currentPage,
  totalPages,
  onPageChange,
  selectedIds,
  selectAll,
  clearSelection,
  handleBulkArchive,
  handleBulkTag,
  handleEmptyTrash,
  selectedTab,
  activeActionId,
  isGeneratingDraft,
  customCommandMode,
  customPrompt,
  setCustomPrompt,
  setCustomCommandMode,
  handleOpenEmail,
  handleToggleStar,
  handleToggleAction,
  handleManualAnalyze,
  handleSaveContact,
  handleDraftReply,
  handleExecuteCustomCommand,
  handleDeleteMessage,
  handleRestoreMessage,
  toggleSelection,
  setIsTagModalOpen,
  setTagModalEmail,
  messageTags,
  gmailLabels = [],
  isBuffering,
}: LeadsListContentProps) {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <LeadsHeader
        isConnected={isConnected}
        loading={loading}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        onRefresh={onRefresh}
        onConnect={onConnect}
        totalCount={allItems.length}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        selectedCount={selectedIds.size}
        totalVisibleCount={paginatedItems.filter((i) => i.itemType === "email").length}
        onToggleSelectAll={() => {
          const emailsToSelect = paginatedItems.filter((item) => item.itemType === "email").map((i: any) => i.id);
          selectAll(emailsToSelect);
        }}
        onClearSelection={clearSelection}
        onBulkArchive={() => handleBulkArchive(Array.from(selectedIds))}
        onBulkTag={(tag) => handleBulkTag(Array.from(selectedIds), tag)}
        onEmptyTrash={handleEmptyTrash}
        currentTab={selectedTab}
        gmailLabels={gmailLabels}
        isBuffering={isBuffering}
      />

      <div className="flex-1 overflow-y-auto px-4 pb-8 thin-scrollbar relative scroll-smooth bg-transparent transform-gpu">
        <div className="sticky top-0 left-0 right-0 h-4 bg-gradient-to-b from-black/20 to-transparent z-20 pointer-events-none" />
        
        <div className="bg-white/5 dark:bg-black/20 backdrop-blur-md rounded-[2rem] border border-white/5 shadow-[0_20px_40px_-8px_rgba(0,0,0,0.2)] overflow-hidden transition-all duration-700 relative">
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
                  onExecuteCustomCommand={() => {
                    const msg = item as unknown as GmailMessage;
                    handleExecuteCustomCommand(msg, customPrompt);
                  }}
                  onDeleteMessage={handleDeleteMessage}
                  onRestoreMessage={handleRestoreMessage}
                  isSelected={selectedIds.has((item as any).id)}
                  onToggleSelection={(e, id) => toggleSelection(id)}
                  onToggleTag={(e, msg) => {
                    setTagModalEmail(msg);
                    setIsTagModalOpen(true);
                  }}
                  tags={messageTags[(item as any).id] || []}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
