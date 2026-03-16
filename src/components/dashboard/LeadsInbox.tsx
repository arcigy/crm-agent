"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { ContactExtractionModal } from "@/components/dashboard/ContactExtractionModal";
import { QuickComposerModal } from "@/components/dashboard/QuickComposerModal";
import { ComposeModal } from "@/components/dashboard/ComposeModal";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { agentCreateContact } from "@/app/actions/agent";

import { useLeadsInbox } from "@/hooks/useLeadsInbox";
import { EmailDetailView } from "./leads/EmailDetailView";
import { LeadsSidebar } from "./leads/LeadsSidebar";
import { LeadsModals } from "./leads/LeadsModals";
import { LeadsListContent } from "./leads/LeadsListContent";
import { GmailMessage } from "@/types/gmail";

interface LeadsInboxProps {
  initialMessages?: GmailMessage[];
}

export function LeadsInbox({ initialMessages = [] }: LeadsInboxProps) {
  const inbox = useLeadsInbox(initialMessages);
  const router = useRouter();
  const pathname = usePathname();
  const analyzedIds = React.useRef<Set<string>>(new Set());

  // Close compose and clean URL parameter
  const handleCloseCompose = React.useCallback(() => {
    inbox.setIsComposeOpen(false);
    // Remove ?compose= from URL to prevent re-opening
    if (typeof window !== 'undefined' && window.location.search.includes('compose')) {
      router.replace(pathname, { scroll: false });
    }
  }, [inbox, router, pathname]);

  // Effect to trigger analysis for unclassified emails
  React.useEffect(() => {
    inbox.allItems.forEach((item) => {
      if (item.itemType === "email") {
        const msg = item as GmailMessage;
        if (!msg.classification && !msg.isAnalyzing && !analyzedIds.current.has(msg.id)) {
          analyzedIds.current.add(msg.id);
          inbox.analyzeEmail(msg);
        }
      }
    });
  }, [inbox.allItems, inbox.analyzeEmail]);

  // Compute known emails for autocomplete from messages
  const recentEmails = React.useMemo(() => {
    const emailMap = new Map<string, string>();
    inbox.messages.forEach(m => {
      if (!m.from) return;
      const match = m.from.match(/^(.*?)\s*<(.+?)>$/);
      if (match) {
        const name = match[1].replace(/"/g, '').trim();
        const email = match[2].toLowerCase().trim();
        if (!emailMap.has(email) || (name && !emailMap.get(email))) emailMap.set(email, name);
      } else if (m.from.includes('@')) {
        const email = m.from.toLowerCase().trim();
        if (!emailMap.has(email)) emailMap.set(email, '');
      }
    });
    return Array.from(emailMap.entries()).map(([email, name]) => ({ email, name }));
  }, [inbox.messages]);

  return (
    <div className="flex h-full bg-transparent overflow-hidden relative">
      <LeadsModals 
        {...inbox}
        recentEmails={recentEmails}
        onCloseCompose={handleCloseCompose}
      />

      <div className="relative z-10 bg-transparent w-[240px] flex-shrink-0">
        <LeadsSidebar 
          selectedTab={inbox.selectedTab} 
          onTabChange={(tab: any) => {
            inbox.setSelectedTab(tab);
            inbox.setSelectedEmail(null);
            inbox.onPageChange(1);
          }} 
          unreadCount={inbox.messages.filter((m: any) => !m.isRead).length}
          draftCount={inbox.hasDraft ? 1 : 0}
          onCompose={() => {
            inbox.setDraftData({ to: "", subject: "", body: "" });
            inbox.setIsComposeOpen(true);
          }}
          gmailLabels={inbox.gmailLabels}
          inboxStats={inbox.inboxStats}
          onManageTags={() => {
            inbox.setTagModalEmail(null);
            inbox.setIsTagModalOpen(true);
          }}
        />
      </div>

      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10 bg-transparent min-w-0">
        {inbox.selectedEmail ? (
          <EmailDetailView
            email={inbox.selectedEmail}
            onClose={() => inbox.setSelectedEmail(null)}
            onDeleteMessage={(email) => inbox.handleDeleteMessage(null, email)}
            onArchive={inbox.handleArchiveMessage}
            onSpam={inbox.handleSpamMessage}
            onMarkUnread={inbox.handleMarkUnreadMessage}
            onRestore={inbox.handleRestoreMessage}
            onToggleStar={inbox.handleToggleStar}
            onReply={(email) => {
              const formattedDate = email.date ? new Date(email.date).toLocaleString('sk-SK') : '';
              inbox.setDraftData({
                to: email.from,
                subject: "", 
                body: `\n\n\nDňa ${formattedDate} ${email.from} napísal(a):\n> ${email.snippet.replace(/\n/g, '\n> ')}`
              });
              inbox.setIsComposeOpen(true);
            }}
            onForward={(email) => {
              const formattedDate = email.date ? new Date(email.date).toLocaleString('sk-SK') : '';
              inbox.setDraftData({
                to: "",
                subject: "", 
                body: `\n\n\n---------- Preposlaná správa ----------\nOd: ${email.from}\nDátum: ${formattedDate}\nPredmet: ${email.subject}\n\n${email.snippet}`
              });
              inbox.setIsComposeOpen(true);
            }}
          />
        ) : (
          <LeadsListContent 
            {...inbox}
            onSearchChange={inbox.onSearchChange}
            onRefresh={inbox.onRefresh}
            onConnect={inbox.onConnect}
            onPageChange={inbox.onPageChange}
          />
        )}
      </div>
    </div>
  );
}
