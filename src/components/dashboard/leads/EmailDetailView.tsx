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
import { useEmailContext } from "@/components/providers/EmailContextProvider";
import directus from "@/lib/directus";
import { readItems } from "@directus/sdk";
import { Lead } from "@/types/contact";

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
  tags?: string[];
  gmailLabels?: any[];
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
  tags = [],
  gmailLabels = [],
}: EmailDetailViewProps) {
  const [downloading, setDownloading] = React.useState<string | null>(null);
  const [showFullDetails, setShowFullDetails] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<GmailMessage[]>([email]);
  const [isLoadingBody, setIsLoadingBody] = React.useState(true);
  const [saveToDriveOpen, setSaveToDriveOpen] = React.useState(false);
  const [activeMenu, setActiveMenu] = React.useState<'top' | 'bottom' | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = React.useState(false);
  const [taskTitle, setTaskTitle] = React.useState("");
  const [taskStartDate, setTaskStartDate] = React.useState("");
  const [taskStartTime, setTaskStartTime] = React.useState("");
  const [isScanning, setIsScanning] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const { setActiveEmail, clearEmailContext } = useEmailContext();

  // Load full thread messages
  React.useEffect(() => {
    const tid = email.threadId || email.id;
    const senderEmailRaw = email.from || "";
    const senderEmail = senderEmailRaw.includes("<") 
      ? senderEmailRaw.split("<")[1].split(">")[0] 
      : senderEmailRaw;

    if (tid) {
      setIsLoadingBody(true);
      
      // Concurrently fetch thread and search for contact
      Promise.all([
        fetch(`/api/google/gmail?threadId=${tid}`).then(res => res.json()),
        directus.request(readItems("contacts", {
          filter: { email: { _icontains: senderEmail } },
          limit: 1
        }))
      ])
      .then(([threadData, contacts]) => {
        const fullThread = threadData.messages && threadData.messages.length > 0 
          ? threadData.messages 
          : [email];
        
        const contact = (contacts as Lead[])?.[0] || null;
        
        if (threadData.messages) {
          setMessages(threadData.messages);
        }
        
        // Populate global email context for the AI agent
        setActiveEmail(email, fullThread, contact);
      })
      .catch(err => {
        console.error("Context data fetch error:", err);
        // Fallback: at least set the current email without thread/contact
        setActiveEmail(email, [email], null);
      })
      .finally(() => setIsLoadingBody(false));
    } else {
      setIsLoadingBody(false);
      setActiveEmail(email, [email], null);
    }

    // Cleanup when user leaves the detail view
    return () => {
      clearEmailContext();
    };
  }, [email.id, email.threadId, setActiveEmail, clearEmailContext]);

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
    
    const latestMsg = messages[messages.length - 1];
    const senderName = latestMsg.from?.split("<")[0]?.trim().replace(/"/g, "") || "Neznámy";
    const subject = latestMsg.subject || "Bez predmetu";
    setTaskTitle(`Odpovedať na e-mail od: ${senderName}`);
    setTaskStartDate(""); 
    setTaskStartTime(""); 
    setIsTaskModalOpen(true);

    try {
      const bodyToAnalyze = latestMsg.snippet || latestMsg.body || latestMsg.bodyHtml?.replace(/<[^>]*>?/gm, '') || "";
      const res = await generateTaskTitleFromEmail(subject, bodyToAnalyze, senderName);
      if (res.success && res.title) {
        setTaskTitle(res.title);
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
      const latestMsg = messages[messages.length - 1];
      const subject = latestMsg.subject || "Bez predmetu";
      const titleWithLink = `${taskTitle.trim()} (<a href="/dashboard/outreach/leads?messageId=${latestMsg.id}" class="text-violet-500 hover:text-violet-600 font-bold hover:underline transition-colors" data-email-link="true">E-mail: ${subject}</a>)`;
      
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
      <style>{`
        .violet-select-zone *::selection { background-color: rgba(124, 58, 237, 0.25); color: inherit; }
        .violet-select-zone *::-moz-selection { background-color: rgba(124, 58, 237, 0.25); color: inherit; }
      `}</style>
      
      {/* ── Top Toolbar ── */}
      <div className="h-14 px-4 flex items-center justify-between flex-shrink-0 bg-white dark:bg-zinc-950 border-b border-black/[0.03] dark:border-white/[0.03] select-none">
        <div className="flex items-center gap-1">
          <button onClick={onClose} className="p-2 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-full transition-all text-violet-600/70 hover:text-violet-600" title="Späť">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="h-5 w-[1px] bg-violet-500/10 mx-1" />
          <button onClick={() => { onArchive?.(email); onClose(); }} className="p-2 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-full transition-all text-[#444746] hover:text-violet-600" title="Archivovať">
            <Archive className="w-5 h-5" />
          </button>
          <button onClick={() => { onSpam?.(email); onClose(); }} className="p-2 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-full transition-all text-[#444746] hover:text-violet-600" title="Nahlásiť spam">
            <AlertOctagon className="w-5 h-5" />
          </button>
          {email.labels?.includes("TRASH") ? (
            <button onClick={() => { onRestore?.(null, email); onClose(); }} className="p-2 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-full transition-all text-[#444746] hover:text-green-600" title="Obnoviť z koša">
              <RotateCcw className="w-5 h-5" />
            </button>
          ) : (
            <button onClick={() => { onDeleteMessage(email); onClose(); }} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all text-[#444746] hover:text-red-500" title="Odstrániť">
              <Trash2 className="w-5 h-5" />
            </button>
          )}
          <div className="h-5 w-[1px] bg-violet-500/10 mx-1" />
          <button onClick={() => { onMarkUnread?.(email); onClose(); }} className="p-2 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-full transition-all text-[#444746] hover:text-violet-600" title="Označiť ako neprečítané">
            <Mail className="w-5 h-5" />
          </button>
          <button onClick={() => { toast.info("Funkcia 'Presunúť do' bude dostupná v ďalšej verzii"); }} className="p-2 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-full transition-all text-[#444746] hover:text-violet-600" title="Presunúť do">
            <FolderInput className="w-5 h-5" />
          </button>
          <button onClick={() => { toast.info("Správa štítkov je v príprave"); }} className="p-2 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-full transition-all text-[#444746] hover:text-violet-600" title="Štítky">
            <Tag className="w-5 h-5" />
          </button>
          <div className="relative">
            <button onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'top' ? null : 'top'); }} className="p-2 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-full transition-all text-[#444746] hover:text-violet-600 focus:outline-none" title="Viac">
              <MoreVertical className="w-5 h-5" />
            </button>
            {activeMenu === 'top' && (
              <div ref={menuRef} className="absolute top-full right-0 mt-1 w-64 bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-2xl shadow-xl z-50 py-2 animate-in fade-in zoom-in-95 duration-150">
                <button onClick={handleCreateTask} className="w-full text-left px-4 py-2 hover:bg-violet-50 dark:hover:bg-violet-900/20 text-[13px] font-bold text-zinc-700 dark:text-zinc-200 transition-colors flex items-center gap-3">
                  <ListTodo className="w-4 h-4 text-violet-500" /> Vytvoriť úlohu z tohto e-mailu
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-[#444746] mr-4 whitespace-nowrap">
            {currentIndex > 0 ? `${currentIndex} z ${totalCount}` : `— z ${totalCount}`}
          </span>
          <button className="p-2 hover:bg-black/5 rounded-full transition-all text-[#444746] opacity-50" disabled title="Predchádzajúca správa"><ChevronLeft className="w-5 h-5" /></button>
          <button className="p-2 hover:bg-black/5 rounded-full transition-all text-[#444746]" title="Ďalšia správa"><ChevronRight className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto thin-scrollbar">
        <div className="max-w-[1200px] min-h-full mx-auto px-6 md:px-12 py-10">
          {/* ── Subject Area ── */}
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <h2 className="text-[28px] font-black tracking-tight text-[#2d1b4e] dark:text-zinc-100 leading-tight">
                {email.subject || "(Bez predmetu)"}
              </h2>
              {tags
                .filter(tag => !['INBOX', 'UNREAD', 'STARRED', 'SENT', 'DRAFT', 'TRASH', 'SPAM', 'IMPORTANT', 'CATEGORY_PERSONAL', 'CATEGORY_SOCIAL', 'CATEGORY_PROMOTIONS', 'CATEGORY_UPDATES', 'CATEGORY_FORUMS', 'YELLOW_STAR', 'BLUE_STAR', 'RED_STAR', 'ORANGE_STAR', 'GREEN_STAR', 'PURPLE_STAR'].includes(tag.toUpperCase()))
                .map((tag: string) => {
                const labelObj = gmailLabels.find(l => l.id === tag);
                const name = labelObj ? labelObj.name : tag;
                const color = labelObj?.color || email.googleLabelColors?.[tag] || "#8e63ce";
                return (
                  <span key={tag} className="px-3 py-1 text-[11px] rounded-full font-black uppercase tracking-widest border" style={{ borderColor: `${color}40`, backgroundColor: `${color}15`, color: color }}>
                    {name.replace(/^CRM\//, '')}
                  </span>
                );
              })}
            </div>
            <div className="flex items-center gap-4 text-violet-400">
              <button onClick={() => window.print()} title="Vytlačiť všetko" className="hover:text-violet-600 transition-colors"><Printer className="w-5 h-5" /></button>
              <button onClick={() => { toast.success("Email otvorený v novom sandboxovanom okne"); }} title="V novom okne" className="hover:text-violet-600 transition-colors"><ExternalLink className="w-5 h-5" /></button>
            </div>
          </div>

          {/* ── Conversation Messages ── */}
          <div className="space-y-6">
            {isLoadingBody && messages.length <= 1 ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-4 bg-violet-100 dark:bg-violet-900/10 rounded w-3/4" />
                <div className="h-4 bg-violet-100 dark:bg-violet-900/10 rounded w-5/6" />
                <div className="h-4 bg-violet-100 dark:bg-violet-900/10 rounded w-2/3" />
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="group/msg border-b border-black/[0.03] dark:border-white/[0.03] pb-8 last:border-0">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-sm font-black uppercase text-slate-500 shadow-sm border border-black/5 flex-shrink-0">
                        {(msg.from || "?")[0]}
                      </div>
                      <div className="text-[14px]">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 dark:text-zinc-100">{msg.from?.split("<")[0].replace(/"/g, "") || msg.from}</span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {msg.date && !isNaN(new Date(msg.date).getTime()) 
                                ? format(new Date(msg.date), "d. MMMM HH:mm", { locale: sk }) 
                                : ""}
                          </span>
                        </div>
                        <div className="text-slate-500 text-[12px] flex items-center gap-1.5 mt-0.5">
                          <span className="opacity-70">komu: mne</span>
                          <button onClick={() => setShowFullDetails(showFullDetails === msg.id ? null : msg.id)} className="text-violet-500 hover:text-violet-700 font-bold transition-colors">
                            <span className="text-[10px] uppercase tracking-wider ml-1">detaily</span>
                          </button>
                        </div>
                        {showFullDetails === msg.id && (
                          <div className="mt-3 p-3 bg-slate-50 dark:bg-zinc-900/50 rounded-xl border border-black/5 dark:border-white/5 space-y-1 text-[11px]">
                            <div><span className="text-slate-400 font-bold w-12 inline-block">OD:</span> {msg.from}</div>
                            <div><span className="text-slate-400 font-bold w-12 inline-block">KOMU:</span> {msg.to || "mne"}</div>
                            <div><span className="text-slate-400 font-bold w-12 inline-block">DÁTUM:</span> {msg.date}</div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover/msg:opacity-100 transition-all">
                        <button onClick={() => onReply?.(msg)} className="p-2 hover:bg-violet-50 dark:hover:bg-violet-900/20 text-slate-400 hover:text-violet-600 rounded-full transition-all" title="Odpovedať"><Reply className="w-4 h-4" /></button>
                        <button onClick={() => onForward?.(msg)} className="p-2 hover:bg-violet-50 dark:hover:bg-violet-900/20 text-slate-400 hover:text-violet-600 rounded-full transition-all" title="Preposlať"><Forward className="w-4 h-4" /></button>
                    </div>
                  </div>

                  <div className="pl-14">
                    {msg.bodyHtml ? (
                      <iframe
                        srcDoc={`
                          <!DOCTYPE html>
                          <html>
                            <head>
                              <style>
                                body { font-family: sans-serif; font-size: 15px; line-height: 1.6; color: ${typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? '#e4e4e7' : '#18181b'}; margin: 0; }
                                a { color: #8b5cf6; }
                                img { max-width: 100%; height: auto; border-radius: 8px; }
                                blockquote { border-left: 3px solid #ddd; margin: 10px 0; padding-left: 15px; color: #666; }
                              </style>
                            </head>
                            <body>${msg.bodyHtml}</body>
                          </html>
                        `}
                        className="w-full h-auto min-h-[100px] border-none"
                        onLoad={(e) => {
                          const ifrm = e.currentTarget;
                          const resize = () => {
                            if (ifrm.contentWindow?.document.body) {
                              ifrm.style.height = ifrm.contentWindow.document.body.scrollHeight + 20 + 'px';
                            }
                          };
                          resize();
                          setTimeout(resize, 100);
                        }}
                        sandbox="allow-same-origin"
                      />
                    ) : (
                      <div className="text-[15px] whitespace-pre-wrap text-slate-700 dark:text-zinc-300">
                        {msg.body || msg.snippet}
                      </div>
                    )}

                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {msg.attachments.map(att => (
                          <button key={att.id} onClick={() => handleDownload(att)} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 rounded-lg text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 transition-all">
                            <Paperclip className="w-3.5 h-3.5" /> {att.filename}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ── AI Insights Panel ── */}
          {classification && (
            <div className="mt-8 mb-10 p-6 bg-[#f8f6ff] dark:bg-violet-900/10 border border-violet-100 dark:border-violet-900/30 rounded-[2rem] flex gap-5 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-900/20 flex items-center justify-center flex-shrink-0 text-violet-600 shadow-inner">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                 <div className="flex items-center gap-3 mb-3">
                    <span className="text-[12px] font-black uppercase tracking-widest text-violet-600">AI Analýza dopytu</span>
                 </div>
                 <p className="text-[15px] text-[#2e2e2e] dark:text-zinc-200 font-bold leading-relaxed mb-4">{classification.summary}</p>
                 <div className="flex flex-wrap gap-3">
                    <div className="px-4 py-2 bg-white dark:bg-zinc-800 border border-violet-200 rounded-xl text-[13px] font-black text-violet-700">{classification.intent}</div>
                    {classification.estimated_budget && <div className="px-4 py-2 bg-violet-600 text-white rounded-xl text-[13px] font-black">{classification.estimated_budget}</div>}
                 </div>
              </div>
            </div>
          )}

          {/* ── Footer Actions ── */}
          <div className="flex items-center gap-3 pt-8 select-none pb-12 border-t border-black/[0.03] mt-8">
            <button onClick={() => onReply?.(messages[messages.length - 1])} className="flex items-center gap-2.5 px-7 py-3 bg-violet-600 text-white rounded-2xl text-[14px] font-black hover:bg-violet-700 transition-all active:scale-95 group">
              <Reply className="w-4 h-4" /> Odpovedať všetkým
            </button>
            <button onClick={() => onForward?.(messages[messages.length - 1])} className="flex items-center gap-2.5 px-7 py-3 border-2 border-violet-100 rounded-2xl text-[14px] font-black text-violet-600 hover:bg-violet-600 hover:text-white transition-all active:scale-95">
              <Forward className="w-4 h-4" /> Preposlať celú niť
            </button>
            <button onClick={() => { toast.success("Reakcia pridaná (✨)"); }} className="p-3 hover:bg-violet-50 rounded-2xl transition-all text-violet-400 hover:text-violet-600">
              <Smile className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Task Modal ── */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-3xl shadow-2xl border border-violet-100">
            <div className="p-6 border-b border-black/5 flex items-center justify-between">
              <h3 className="text-base font-black text-violet-950 dark:text-violet-100 uppercase">Nová úloha z e-mailu</h3>
            </div>
            <div className="p-6 space-y-5">
              <input type="text" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} className="w-full px-4 py-3 border border-violet-200 rounded-xl font-bold" />
              <div className="grid grid-cols-2 gap-4">
                <PremiumDatePicker value={taskStartDate} onChange={setTaskStartDate} />
                <PremiumTimePicker value={taskStartTime} onChange={setTaskStartTime} />
              </div>
            </div>
            <div className="p-6 bg-violet-50/50 flex justify-end gap-3">
              <button onClick={() => setIsTaskModalOpen(false)} className="px-6 py-2.5 font-black uppercase text-[11px]">Zrušiť</button>
              <button onClick={submitTask} disabled={!taskTitle.trim()} className="px-8 py-2.5 bg-violet-600 text-white font-black uppercase text-[11px] rounded-xl">Vytvoriť a prepojiť</button>
            </div>
          </div>
        </div>
      )}

      {saveToDriveOpen && email.attachments && (
        <SaveToDriveModal email={email} attachments={email.attachments} onClose={() => setSaveToDriveOpen(false)} />
      )}
    </div>
  );
}
