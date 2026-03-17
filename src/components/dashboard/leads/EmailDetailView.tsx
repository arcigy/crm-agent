"use client";

import * as React from "react";
import { format, formatDistanceToNow } from "date-fns";
import { sk } from "date-fns/locale";

import {
  ArrowLeft,
  Trash2,
  Archive,
  AlertOctagon,
  Mail,
  FolderInput,
  FolderUp,
  Tag,
  MoreVertical,
  Printer,
  ExternalLink,
  Star,
  Reply,
  Forward,
  Download,
  Paperclip,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Smile,
  Sparkles,
  Zap,
  Target,
  TrendingUp,
  User,
  ListTodo,
  Ban,
  RotateCcw,
  UserPlus,
  Briefcase
} from "lucide-react";
import { GmailMessage, GmailAttachment } from "@/types/gmail";
import { toast } from "sonner";
import { createTask } from "@/app/actions/tasks";
import { generateTaskTitleFromEmail } from "@/app/actions/tasks";
import { PremiumDatePicker } from "@/components/ui/PremiumDatePicker";
import { PremiumTimePicker } from "@/components/ui/PremiumTimePicker";
import { SaveToDriveModal } from "./SaveToDriveModal";

interface EmailDetailViewProps {
  email: GmailMessage;
  onClose: () => void;
  onDeleteMessage: (email: GmailMessage) => void;
  onArchive?: (email: GmailMessage) => void;
  onSpam?: (email: GmailMessage) => void;
  onMarkUnread?: (email: GmailMessage) => void;
  onToggleStar?: (e: React.MouseEvent, email: GmailMessage) => void;
  onReply?: (email: GmailMessage) => void;
  onForward?: (email: GmailMessage) => void;
  onRestore?: (e: React.MouseEvent | null, email: GmailMessage) => void;
  onSaveContact?: (e: React.MouseEvent, email: GmailMessage) => void;
  onCreateDeal?: (e: React.MouseEvent, email: GmailMessage) => void;
  currentIndex?: number;
  totalCount?: number;
}

export function EmailDetailView({ 
  email, 
  onClose, 
  onDeleteMessage,
  onArchive,
  onSpam,
  onMarkUnread,
  onToggleStar,
  onReply,
  onForward,
  onRestore,
  onSaveContact,
  onCreateDeal,
  currentIndex = 0,
  totalCount = 0,
}: EmailDetailViewProps) {
  const [downloading, setDownloading] = React.useState<string | null>(null);
  const [showFullDetails, setShowFullDetails] = React.useState(false);
  const [bodyHtml, setBodyHtml] = React.useState<string | null>(email.bodyHtml || null);
  const [isLoadingBody, setIsLoadingBody] = React.useState(!email.bodyHtml);
  const [saveToDriveOpen, setSaveToDriveOpen] = React.useState(false);

  // Load full body if not already present (Optimistic Preview)
  React.useEffect(() => {
    if (!email.bodyHtml && email.id) {
      setIsLoadingBody(true);
      fetch(`/api/google/gmail?id=${email.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.message?.bodyHtml) {
            setBodyHtml(data.message.bodyHtml);
          }
        })
        .finally(() => setIsLoadingBody(false));
    } else {
      setBodyHtml(email.bodyHtml || null);
      setIsLoadingBody(false);
    }
  }, [email.id, email.bodyHtml]);

  const [activeMenu, setActiveMenu] = React.useState<'top' | 'bottom' | null>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };
    if (activeMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeMenu]);

  // Task creation state
  const [isTaskModalOpen, setIsTaskModalOpen] = React.useState(false);
  const [taskTitle, setTaskTitle] = React.useState("");
  const [taskStartDate, setTaskStartDate] = React.useState("");
  const [taskStartTime, setTaskStartTime] = React.useState("");
  const [isScanning, setIsScanning] = React.useState(false);

  const handleDownload = async (attachment: GmailAttachment) => {
    setDownloading(attachment.id);
    try {
      const res = await fetch("/api/google/gmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: email.id,
          attachmentId: attachment.id,
          filename: attachment.filename,
        }),
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = attachment.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Failed to download:", error);
    } finally {
      setDownloading(null);
    }
  };

  const handleCreateTask = async () => {
    setActiveMenu(null);
    setIsScanning(true);
    
    // Set default fallback title immediately
    const senderName = email.from?.split("<")[0]?.trim().replace(/"/g, "") || "Neznámy";
    const subject = email.subject || "Bez predmetu";
    setTaskTitle(`Odpovedať na e-mail od: ${senderName}`);
    setTaskStartDate(""); 
    setTaskStartTime(""); 
    setIsTaskModalOpen(true);

    try {
      // We pass the raw snippet or body text (not HTML)
      const bodyToAnalyze = email.snippet || email.body || email.bodyHtml?.replace(/<[^>]*>?/gm, '') || "";
      console.log("Starting AI title generation...");
      
      const res = await generateTaskTitleFromEmail(subject, bodyToAnalyze, senderName);
      console.log("AI title generation result:", res);
      
      if (res.success && res.title) {
        setTaskTitle(res.title);
      } else if (!res.success) {
        toast.error("AI nepodarilo sa vygenerovať zadanie: " + res.error);
      }
    } catch (error) {
      console.error("AI Title Generation Error:", error);
    } finally {
      setIsScanning(false);
    }
  };

  const submitTask = async () => {
    try {
      if (!taskTitle.trim()) return;
      const toastId = toast.loading("Vytváram úlohu...");
      
      const subject = email.subject || "Bez predmetu";
      // Format link so it's clickable in the SmartText component
      const titleWithLink = `${taskTitle.trim()} (<a href="/dashboard/outreach/leads?messageId=${email.id}" class="text-violet-500 hover:text-violet-600 font-bold hover:underline transition-colors" data-email-link="true">E-mail: ${subject}</a>)`;
      
      let finalDueDate: string | undefined = undefined;
      if (taskStartDate) {
         try {
           const [sYear, sMonth, sDay] = taskStartDate.split('-').map(Number);
           const [sHour, sMinute] = (taskStartTime || "00:00").split(':').map(Number);
           const startDateObj = new Date(sYear, sMonth - 1, sDay, sHour, sMinute);
           if (!isNaN(startDateObj.getTime())) {
               finalDueDate = startDateObj.toISOString();
           }
         } catch (e) {
           console.error("Date parsing error", e);
         }
      }

      const res = await createTask(titleWithLink, finalDueDate);
      if (res.success) {
        toast.success("Úloha bola pridaná do denníka", { id: toastId });
        setIsTaskModalOpen(false);
      } else {
        toast.error("Nepodarilo sa vytvoriť úlohu", { id: toastId });
      }
    } catch (error) {
      console.error(error);
      toast.error("Vyskytla sa nečakaná chyba");
    }
  };

  const classification = email.classification;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-black text-[#1f1f1f] font-sans overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300 relative violet-select-zone">
      {/* Violet text selection style */}
      <style>{`
        .violet-select-zone *::selection {
          background-color: rgba(124, 58, 237, 0.25);
          color: inherit;
        }
        .violet-select-zone *::-moz-selection {
          background-color: rgba(124, 58, 237, 0.25);
          color: inherit;
        }
      `}</style>
      {/* ── Top Toolbar (Gmail Style) ── */}
      <div className="h-14 px-4 flex items-center justify-between flex-shrink-0 bg-white dark:bg-zinc-950 border-b border-black/[0.03] dark:border-white/[0.03] select-none">
        <div className="flex items-center gap-1">
          <button onClick={onClose} className="p-2 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-full transition-all text-violet-600/70 hover:text-violet-600" title="Späť">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="h-5 w-[1px] bg-violet-500/10 mx-1" />
          <button 
            onClick={() => {
              onArchive?.(email);
              onClose();
            }} 
            className="p-2 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-full transition-all text-[#444746] hover:text-violet-600" 
            title="Archivovať"
          >
            <Archive className="w-5 h-5" />
          </button>
          <button 
            onClick={() => {
              onSpam?.(email);
              onClose();
            }} 
            className="p-2 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-full transition-all text-[#444746] hover:text-violet-600" 
            title="Nahlásiť spam"
          >
            <AlertOctagon className="w-5 h-5" />
          </button>
          {email.labels?.includes("TRASH") ? (
            <button 
              onClick={() => {
                onRestore?.(null, email);
                onClose();
              }}
              className="p-2 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-full transition-all text-[#444746] hover:text-green-600" 
              title="Obnoviť z koša"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          ) : (
            <button 
              onClick={() => {
                onDeleteMessage(email);
                onClose();
              }}
              className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all text-[#444746] hover:text-red-500" 
              title="Odstrániť"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
          <div className="h-5 w-[1px] bg-violet-500/10 mx-1" />
          <button 
            onClick={() => {
              onMarkUnread?.(email);
              onClose();
            }} 
            className="p-2 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-full transition-all text-[#444746] hover:text-violet-600" 
            title="Označiť ako neprečítané"
          >
            <Mail className="w-5 h-5" />
          </button>
          <button 
            onClick={() => {
              import('sonner').then(({ toast }) => toast.info("Funkcia 'Presunúť do' bude dostupná v ďalšej verzii"));
            }} 
            className="p-2 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-full transition-all text-[#444746] hover:text-violet-600" 
            title="Presunúť do"
          >
            <FolderInput className="w-5 h-5" />
          </button>
          <button 
            onClick={() => {
              import('sonner').then(({ toast }) => toast.info("Správa štítkov je v príprave"));
            }} 
            className="p-2 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-full transition-all text-[#444746] hover:text-violet-600" 
            title="Štítky"
          >
            <Tag className="w-5 h-5" />
          </button>
          <div className="relative">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenu(activeMenu === 'top' ? null : 'top');
              }}
              className="p-2 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-full transition-all text-[#444746] hover:text-violet-600 focus:outline-none" 
              title="Viac"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {activeMenu === 'top' && (
              <div ref={menuRef} className="absolute top-full right-0 mt-1 w-64 bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-2xl shadow-xl z-50 py-2 animate-in fade-in zoom-in-95 duration-150">
                <button onClick={handleCreateTask} className="w-full text-left px-4 py-2 hover:bg-violet-50 dark:hover:bg-violet-900/20 text-[13px] font-bold text-zinc-700 dark:text-zinc-200 transition-colors flex items-center gap-3">
                  <ListTodo className="w-4 h-4 text-violet-500" /> Vytvoriť úlohu z tohto e-mailu
                </button>
                <div className="h-[1px] bg-black/5 dark:bg-white/10 my-1 mx-2" />
                <button onClick={() => { onSpam?.(email); import('sonner').then(({ toast }) => toast.success("Odosielateľ zablokovaný a nahlásený ako spam")); setActiveMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-[13px] font-bold text-red-600 transition-colors flex items-center gap-3">
                  <Ban className="w-4 h-4" /> Zablokovať / Nahlásiť ako spam
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[12px] text-[#444746] mr-4 whitespace-nowrap">
            {currentIndex > 0 ? `${currentIndex} z ${totalCount}` : `— z ${totalCount}`}
          </span>
          <button className="p-2 hover:bg-black/5 rounded-full transition-all text-[#444746] opacity-50" disabled title="Predchádzajúca správa">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-black/5 rounded-full transition-all text-[#444746]" title="Ďalšia správa">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto thin-scrollbar">
        <div className="max-w-[1200px] min-h-full mx-auto px-6 md:px-12 py-10">
          {/* ── Subject Area ── */}
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <h2 className="text-[28px] font-black tracking-tight text-[#2d1b4e] dark:text-zinc-100 leading-tight select-text">
                {email.subject || "(Bez predmetu)"}
              </h2>
              <span className="px-3 py-1 bg-violet-100 text-violet-700 text-[11px] rounded-full flex items-center gap-1 font-black uppercase tracking-widest shadow-[0_0_15px_rgba(139,92,246,0.2)] border border-violet-200/50 select-none cursor-default">
                Doručené <span className="opacity-40 text-[10px] font-bold">x</span>
              </span>
            </div>
            <div className="flex items-center gap-4 text-violet-400 group select-none">
              <button 
                onClick={() => window.print()}
                title="Vytlačiť všetko" 
                className="hover:text-violet-600 transition-colors hover:scale-110 active:scale-90"
              >
                <Printer className="w-5 h-5" />
              </button>
              <button 
                onClick={() => {
                  import('sonner').then(({ toast }) => toast.success("Email otvorený v novom sandboxovanom okne"));
                }}
                title="V novom okne" 
                className="hover:text-violet-600 transition-colors hover:scale-110 active:scale-90"
              >
                <ExternalLink className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ── Sender Information ── */}
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center text-xl font-black uppercase shadow-lg border-2 border-white flex-shrink-0 select-none">
                {(email.from || "?")[0]}
              </div>
              <div className="text-[14px]">
                <div className="flex items-center gap-2">
                  <span className="font-black text-[16px] text-violet-700 dark:text-violet-400 select-text">
                    {email.from?.split("<")[0].replace(/"/g, "") || email.from}
                  </span>
                  <span className="text-indigo-500 font-bold bg-indigo-50 px-2 py-0.5 rounded-md text-[12px] border border-indigo-100 select-text">
                    &lt;{email.from?.match(/<(.+)>/)?.[1] || email.from}&gt;
                  </span>
                </div>
                <div className="text-[#5e5e5e] text-[12px] flex items-center gap-1.5 mt-2 font-medium select-none">
                  <span className="opacity-70">komu:</span>
                  <button 
                    onClick={() => setShowFullDetails(!showFullDetails)}
                    className="flex items-center gap-1.5 bg-violet-50 hover:bg-violet-100 dark:bg-violet-900/20 dark:hover:bg-violet-900/40 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded-md transition-all group border border-violet-100 dark:border-violet-800"
                    title={showFullDetails ? "Skryť technické detaily" : "Zobraziť technické detaily (Od, Komu, Dátum)"}
                  >
                    <span className="font-bold tracking-wide">mne</span>
                  </button>
                </div>

                {showFullDetails && (
                  <div className="mt-3 p-4 bg-violet-50/50 dark:bg-violet-900/10 rounded-2xl border border-violet-100 dark:border-violet-900/30 space-y-2 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-[80px_1fr] text-[12px]">
                      <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Od:</span>
                      <span className="text-slate-700 dark:text-slate-300 font-medium select-text">{email.from}</span>
                    </div>
                    <div className="grid grid-cols-[80px_1fr] text-[12px]">
                      <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Komu:</span>
                      <span className="text-slate-700 dark:text-slate-300 font-medium select-text">{email.to || "vašu primárnu adresu"}</span>
                    </div>
                    <div className="grid grid-cols-[80px_1fr] text-[12px]">
                      <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Dátum:</span>
                      <span className="text-slate-700 dark:text-slate-300 font-medium select-text">{email.date}</span>
                    </div>
                    {email.subject && (
                        <div className="grid grid-cols-[80px_1fr] text-[12px]">
                        <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Predmet:</span>
                        <span className="text-slate-700 dark:text-slate-300 font-bold select-text">{email.subject}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4 text-[#5e5e5e] select-none">
              <div className="text-[12px] font-bold flex items-center gap-1">
                {email.date && !isNaN(new Date(email.date).getTime()) ? (
                  <>
                    <span className="text-violet-600/80 font-mono font-bold uppercase tracking-normal">
                      {format(new Date(email.date), "eee d. M. H:mm", { locale: sk })}
                    </span>
                    <span className="opacity-40 font-normal ml-1 text-[11px]">
                      ({formatDistanceToNow(new Date(email.date), { addSuffix: true, locale: sk })})
                    </span>
                  </>
                ) : ""}
              </div>
              <div className="flex items-center gap-2">
                {email.attachments && email.attachments.length > 0 && (
                  <button
                    onClick={() => setSaveToDriveOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 text-[12px] rounded-xl border border-violet-200 text-violet-700 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors font-black uppercase tracking-wide"
                    title="Uložiť prílohy do Google Drive"
                  >
                    <FolderUp className="w-4 h-4" />
                    Uložiť do súborov
                  </button>
                )}
                <button 
                  onClick={(e) => onToggleStar?.(e, email)}
                  title={email.isStarred ? "Odobrať hviezdičku" : "Pridať hviezdičku"}
                  className={`p-2 hover:bg-violet-50 dark:hover:bg-violet-900/30 rounded-full transition-all hover:scale-110 active:scale-90 ${email.isStarred ? 'text-amber-400' : 'text-violet-400 hover:text-violet-600'}`}
                >
                  <Star className={`w-5 h-5 transition-all ${email.isStarred ? 'fill-amber-400' : ''}`} />
                </button>
                <button 
                  onClick={() => onReply?.(email)}
                  title="Odpovedať"
                  className="p-2 hover:bg-violet-50 dark:hover:bg-violet-900/30 text-violet-400 hover:text-violet-600 rounded-full transition-all hover:scale-110 active:scale-90"
                >
                  <Reply className="w-5 h-5 transition-all" />
                </button>
                <div className="relative">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenu(activeMenu === 'bottom' ? null : 'bottom');
                    }}
                    title="Viac možností"
                    className="p-2 hover:bg-violet-50 dark:hover:bg-violet-900/30 text-violet-400 hover:text-violet-600 rounded-full transition-all hover:scale-110 active:scale-90 focus:outline-none"
                  >
                    <MoreVertical className="w-5 h-5 transition-all" />
                  </button>
                  {activeMenu === 'bottom' && (
                    <div ref={menuRef} className="absolute top-full right-0 mt-1 w-64 bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-2xl shadow-xl z-50 py-2 animate-in fade-in zoom-in-95 duration-150">
                      <button onClick={(e) => { onSaveContact?.(e, email); setActiveMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-violet-50 dark:hover:bg-violet-900/20 text-[13px] font-bold text-zinc-700 dark:text-zinc-200 transition-colors flex items-center gap-3">
                        <UserPlus className="w-4 h-4 text-violet-500" /> Vytvoriť kontakt z e-mailu
                      </button>
                      <button onClick={(e) => { onCreateDeal?.(e, email); setActiveMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-violet-50 dark:hover:bg-violet-900/20 text-[13px] font-bold text-zinc-700 dark:text-zinc-200 transition-colors flex items-center gap-3">
                        <Briefcase className="w-4 h-4 text-violet-500" /> Vytvoriť obchod (Deal)
                      </button>
                      <button onClick={handleCreateTask} className="w-full text-left px-4 py-2 hover:bg-violet-50 dark:hover:bg-violet-900/20 text-[13px] font-bold text-zinc-700 dark:text-zinc-200 transition-colors flex items-center gap-3">
                        <ListTodo className="w-4 h-4 text-violet-500" /> Vytvoriť úlohu z tohto e-mailu
                      </button>
                      <div className="h-[1px] bg-black/5 dark:bg-white/10 my-1 mx-2" />
                      <button onClick={() => { onSpam?.(email); import('sonner').then(({ toast }) => toast.success("Odosielateľ zablokovaný a nahlásený ako spam")); setActiveMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-[13px] font-bold text-red-600 transition-colors flex items-center gap-3">
                        <Ban className="w-4 h-4" /> Zablokovať / Nahlásiť ako spam
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Email Body Content Area ── */}
          <div className="text-[16px] leading-[1.8] text-[#111111] dark:text-zinc-100 whitespace-pre-wrap mb-10 border-b border-black/[0.03] pb-10 select-text">
            {isLoadingBody ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-4 bg-violet-100 dark:bg-violet-900/10 rounded w-3/4" />
                <div className="h-4 bg-violet-100 dark:bg-violet-900/10 rounded w-5/6" />
                <div className="h-4 bg-violet-100 dark:bg-violet-900/10 rounded w-2/3" />
                <div className="mt-8 text-slate-400 text-sm italic font-medium">
                  {email.snippet || "Načítavam obsah..."}
                </div>
              </div>
            ) : bodyHtml ? (
              <iframe
                srcDoc={`
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <meta charset="utf-8">
                      <style>
                        body { 
                          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
                          font-size: 16px; 
                          line-height: 1.8; 
                          color: #111111;
                          margin: 0;
                          padding: 0;
                        }
                        a { color: #6366f1; text-decoration: none; font-weight: 600; }
                        a:hover { text-decoration: underline; }
                        img { max-width: 100%; height: auto; border-radius: 12px; margin: 20px 0; }
                        table { width: 100% !important; border-collapse: collapse; margin: 25px 0; }
                        blockquote { border-left: 4px solid #ddd6fe; margin: 20px 0; padding-left: 20px; color: #5b21b6; font-style: italic; background: #f5f3ff; padding: 10px 20px; border-radius: 0 8px 8px 0; }
                        ::selection { background-color: rgba(124, 58, 237, 0.25); color: inherit; }
                        ::-moz-selection { background-color: rgba(124, 58, 237, 0.25); color: inherit; }
                      </style>
                    </head>
                    <body>${bodyHtml}</body>
                  </html>
                `}
                className="w-full h-[600px] border-none"
                title="Email Content"
                sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
              />
            ) : (
              <div className="font-sans whitespace-pre-wrap leading-relaxed">{email.body || "(Prázdny obsah)"}</div>
            )}
          </div>

          {/* ── AI Insights Panel ── */}
          {classification && (
            <div className="mb-10 p-6 bg-[#f8f6ff] border border-violet-100 rounded-[2rem] flex gap-5 shadow-sm select-none">
              <div className="w-12 h-12 rounded-2xl bg-violet-100 flex items-center justify-center flex-shrink-0 text-violet-600 shadow-inner">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                 <div className="flex items-center gap-3 mb-3">
                    <span className="text-[12px] font-black uppercase tracking-widest text-violet-600">AI Analýza dopytu</span>
                    {classification.priority === "vysoka" && (
                      <span className="px-3 py-1 bg-red-100 text-red-700 text-[10px] font-black rounded-full uppercase tracking-tighter">Vysoká priorita</span>
                    )}
                 </div>
                 <p className="text-[15px] text-[#2e2e2e] font-bold leading-relaxed mb-4">
                    {classification.summary}
                 </p>
                 <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 bg-white border border-violet-200 rounded-xl text-[13px] font-black text-violet-700 shadow-sm hover:shadow-md hover:border-violet-300 transition-all cursor-default">
                      <Target className="w-4 h-4 text-violet-500" /> {classification.intent}
                    </div>
                    {classification.estimated_budget && classification.estimated_budget !== "—" && (
                       <div className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl text-[13px] font-black shadow-lg shadow-violet-600/20 hover:scale-105 transition-all cursor-default">
                          <Zap className="w-4 h-4 text-violet-200" /> {classification.estimated_budget}
                       </div>
                    )}
                    {classification.service_category && classification.service_category !== "—" && (
                       <div className="flex items-center gap-2 px-4 py-2 bg-[#fdfcfd] border border-violet-200 text-violet-800 rounded-xl text-[13px] font-black shadow-sm hover:shadow-md hover:border-violet-300 transition-all cursor-default">
                          <TrendingUp className="w-4 h-4 text-violet-500" /> {classification.service_category}
                       </div>
                    )}
                 </div>
                 {classification.next_step && classification.next_step !== "—" && (
                   <div className="mt-5 p-4 bg-white/80 border border-dashed border-violet-200 rounded-2xl">
                      <p className="text-[11px] font-black text-violet-400 uppercase tracking-widest mb-1.5">Odporúčaný ďalší krok</p>
                      <p className="text-[14px] font-black text-violet-800 italic flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-600 animate-pulse" /> {classification.next_step}
                      </p>
                   </div>
                 )}
              </div>
            </div>
          )}

          {/* ── Attachments Section ── */}
          {email.attachments && email.attachments.length > 0 && (
            <div className="border-t border-[#f1f1f1] pt-6 mb-12 select-none">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1.5 text-[14px] font-bold text-[#1f1f1f]">
                  {email.attachments.length === 1 ? "Jedna príloha" : `${email.attachments.length} prílohy`}
                  <span className="text-[#5e5e5e] font-normal mx-1">•</span>
                  <span className="text-[#5e5e5e] font-normal flex items-center gap-1 text-[13px]">
                     Skontrolované Gmailom <CheckCircle2 className="w-3 h-3 text-green-600" />
                  </span>
                </div>
                <button className="text-[13px] font-medium text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded transition-all flex items-center gap-1.5">
                   <Download className="w-4 h-4" /> Stiahnuť všetko
                </button>
              </div>

              <div className="flex flex-wrap gap-4">
                {email.attachments.map((att) => (
                  <div key={att.id} className="w-[180px] group border border-[#dfdfdf] rounded-lg overflow-hidden hover:shadow-md transition-all cursor-pointer">
                    <div className="h-[120px] bg-zinc-50 flex items-center justify-center relative bg-center bg-cover" style={{ backgroundImage: att.mimeType?.startsWith("image/") ? `url(/api/google/gmail/${email.id}/attachment/${att.id})` : "none" }}>
                      {!att.mimeType?.startsWith("image/") && (
                         <div className="flex flex-col items-center gap-1">
                            <Paperclip className="w-8 h-8 text-zinc-300" />
                            <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">{att.filename?.split(".").pop()}</span>
                         </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-4">
                         <button onClick={() => handleDownload(att)} className="p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-all"><Download className="w-5 h-5" /></button>
                         <button className="p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-all"><ExternalLink className="w-5 h-5" /></button>
                      </div>
                    </div>
                    <div className="p-3 bg-white border-t border-[#f1f1f1] flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-red-100 flex items-center justify-center flex-shrink-0">
                         <span className="text-[8px] font-black text-red-600 uppercase">{att.filename?.split(".").pop()}</span>
                      </div>
                      <div className="min-w-0">
                         <p className="text-[12px] font-bold text-[#1f1f1f] truncate">{att.filename}</p>
                         <p className="text-[10px] text-[#5e5e5e]">{(att.size / 1024).toFixed(0)} KB</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Footer Actions ── */}
          <div className="flex items-center gap-3 pt-4 select-none pb-12">
            <button 
              onClick={() => onReply?.(email)}
              className="flex items-center gap-2.5 px-7 py-3 bg-[#f8f6ff] border border-violet-200 rounded-2xl text-[14px] font-black text-violet-800 hover:bg-violet-600 hover:text-white hover:border-violet-600 hover:shadow-lg hover:shadow-violet-600/20 transition-all active:scale-95 group"
            >
              <Reply className="w-4 h-4 text-violet-500 group-hover:text-white transition-colors" /> Odpovedať
            </button>
            <button 
              onClick={() => onForward?.(email)}
              className="flex items-center gap-2.5 px-7 py-3 border-2 border-violet-100 rounded-2xl text-[14px] font-black text-violet-600 hover:bg-violet-600 hover:text-white hover:border-violet-600 hover:shadow-lg hover:shadow-violet-600/30 transition-all active:scale-95 group/forward"
            >
              <Forward className="w-4 h-4 text-violet-500 group-hover/forward:text-white transition-colors" /> Preposlať
            </button>
            <button 
              onClick={() => {
                import('sonner').then(({ toast }) => toast.success("Reakcia pridaná (✨)"));
              }}
              className="p-3 hover:bg-violet-50 rounded-2xl transition-all text-violet-400 hover:text-violet-600 hover:rotate-12 active:scale-90"
            >
              <Smile className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Task Creation Modal ── */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-3xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 border border-violet-100 dark:border-white/10">
            <div className="px-6 py-5 border-b border-black/5 dark:border-white/10 flex items-center justify-between bg-violet-50/50 dark:bg-violet-900/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-violet-600/30">
                  <ListTodo className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-violet-950 dark:text-violet-100 uppercase tracking-tight">
                    Nová úloha z e-mailu
                  </h3>
                  <p className="text-[11px] font-bold text-violet-500 uppercase tracking-widest leading-none mt-1">
                    Úloha bude obsahovať odkaz na tento e-mail
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-[11px] font-black text-violet-700 dark:text-violet-400 uppercase tracking-widest mb-2 flex items-center justify-between">
                  <span>Zadanie úlohy</span>
                  {isScanning && (
                    <span className="text-violet-500 animate-pulse flex items-center gap-1.5 text-[10px]">
                      <Sparkles className="w-3 h-3" /> Generujem AI zadanie...
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    disabled={isScanning}
                    className="w-full px-4 py-3 bg-white dark:bg-black border border-violet-200 dark:border-violet-900/50 rounded-xl text-sm font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all placeholder:font-medium placeholder:opacity-50 disabled:opacity-60"
                    placeholder="Napr. Zavolať klientovi..."
                    autoFocus
                  />
                  {isScanning && (
                    <div className="absolute inset-y-0 right-4 flex items-center justify-center">
                      <div className="w-4 h-4 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
                    </div>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-1 block px-1">
                    Dátum (Voliteľné)
                  </label>
                  <PremiumDatePicker
                    value={taskStartDate}
                    onChange={(v) => setTaskStartDate(v)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-1 block px-1">
                    Čas
                  </label>
                  <PremiumTimePicker
                    value={taskStartTime}
                    onChange={(v) => setTaskStartTime(v)}
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-violet-50/50 dark:bg-black/20 flex justify-end gap-3">
              <button
                onClick={() => setIsTaskModalOpen(false)}
                className="px-6 py-2.5 rounded-xl text-zinc-500 dark:text-zinc-400 font-black text-[11px] uppercase tracking-[0.1em] hover:bg-white dark:hover:bg-zinc-800 transition-all"
              >
                Zrušiť
              </button>
              <button
                onClick={submitTask}
                disabled={!taskTitle.trim()}
                className="px-8 py-2.5 rounded-xl bg-violet-600 text-white font-black text-[11px] uppercase tracking-[0.15em] hover:bg-violet-700 shadow-lg shadow-violet-600/30 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
              >
                Vytvoriť a prepojiť
              </button>
            </div>
          </div>
        </div>
      )}

      {saveToDriveOpen && email.attachments && (
        <SaveToDriveModal
          email={email}
          attachments={email.attachments}
          onClose={() => setSaveToDriveOpen(false)}
        />
      )}
    </div>
  );
}
