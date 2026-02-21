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
} from "lucide-react";
import { GmailMessage, GmailAttachment } from "@/types/gmail";

interface EmailDetailViewProps {
  email: GmailMessage;
  onClose: () => void;
}

export function EmailDetailView({ email, onClose }: EmailDetailViewProps) {
  const [downloading, setDownloading] = React.useState<string | null>(null);

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

  const classification = email.classification;

  return (
    <div className="flex flex-col h-full bg-[#f8f7ff] dark:bg-black text-[#1f1f1f] font-sans overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
      {/* ── Top Toolbar (Gmail Style) ── */}
      <div className="h-14 px-4 flex items-center justify-between flex-shrink-0 bg-transparent dark:bg-zinc-950/50">
        <div className="flex items-center gap-1">
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-all text-[#444746]" title="Späť">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="h-5 w-[1px] bg-[#f1f1f1] mx-1" />
          <button className="p-2 hover:bg-black/5 rounded-full transition-all text-[#444746]" title="Archivovať">
            <Archive className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-black/5 rounded-full transition-all text-[#444746]" title="Nahlásiť spam">
            <AlertOctagon className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-black/5 rounded-full transition-all text-[#444746]" title="Odstrániť">
            <Trash2 className="w-5 h-5" />
          </button>
          <div className="h-5 w-[1px] bg-[#f1f1f1] mx-1" />
          <button className="p-2 hover:bg-black/5 rounded-full transition-all text-[#444746]" title="Označiť ako neprečítané">
            <Mail className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-black/5 rounded-full transition-all text-[#444746]" title="Presunúť do">
            <FolderInput className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-black/5 rounded-full transition-all text-[#444746]" title="Štítky">
            <Tag className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-black/5 rounded-full transition-all text-[#444746]" title="Viac">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[12px] text-[#444746] mr-4">1 z 1 333</span>
          <button className="p-2 hover:bg-black/5 rounded-full transition-all text-[#444746] opacity-50" disabled>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-black/5 rounded-full transition-all text-[#444746]">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        <div className="bg-white dark:bg-zinc-950/40 min-h-full rounded-[1.5rem] shadow-sm border border-black/[0.03] dark:border-white/[0.03] px-12 py-8">
          {/* ── Subject Area ── */}
          <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <h2 className="text-[22px] font-normal tracking-tight text-[#1f1f1f]">
              {email.subject || "(Bez predmetu)"}
            </h2>
            <span className="px-1.5 py-0.5 bg-[#dddddd] text-[#444746] text-[11px] rounded flex items-center gap-1 font-medium">
              Doručené <span className="opacity-60">x</span>
            </span>
          </div>
          <div className="flex items-center gap-4 text-[#444746]">
            <button title="Vytlačiť všetko"><Printer className="w-5 h-5" /></button>
            <button title="V novom okne"><ExternalLink className="w-5 h-5" /></button>
          </div>
        </div>

        {/* ── Sender Information ── */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center text-lg font-medium uppercase shadow-sm">
              {(email.from || "?")[0]}
            </div>
            <div className="text-[14px]">
              <div className="flex items-center gap-1">
                <span className="font-bold text-[#1f1f1f]">{email.from?.split("<")[0] || email.from}</span>
                <span className="text-[#5e5e5e] text-[12px]">&lt;{email.from?.match(/<(.+)>/)?.[1] || email.from}&gt;</span>
              </div>
              <div className="text-[#5e5e5e] text-[12px] flex items-center gap-1 mt-0.5">
                komu: <span className="font-medium">mne</span>
                <button className="hover:bg-black/5 p-0.5 rounded transition-all">
                  <ChevronRight className="w-3 h-3 rotate-90" />
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-[#5e5e5e]">
            <div className="text-[12px] font-medium flex items-center gap-1">
              {email.date && !isNaN(new Date(email.date).getTime()) ? (
                <>
                  {format(new Date(email.date), "eee d. M. H:mm", { locale: sk })}
                  <span className="opacity-60 ml-1">
                    ({formatDistanceToNow(new Date(email.date), { addSuffix: true, locale: sk })})
                  </span>
                </>
              ) : ""}
            </div>
            <div className="flex items-center gap-2">
              <button className="p-1 hover:bg-black/5 rounded-full"><Star className="w-5 h-5" /></button>
              <button className="p-1 hover:bg-black/5 rounded-full"><Smile className="w-5 h-5 opacity-0 group-hover:opacity-100" /></button>
              <button className="p-1 hover:bg-black/5 rounded-full"><Reply className="w-5 h-5" /></button>
              <button className="p-1 hover:bg-black/5 rounded-full"><MoreVertical className="w-5 h-5" /></button>
            </div>
          </div>
        </div>

        {/* ── AI Insights Panel (CRM Integration) ── */}
        {classification && (
          <div className="mb-8 p-5 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0 text-indigo-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
               <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-black uppercase tracking-widest text-indigo-600">AI Analýza dopytu</span>
                  {classification.priority === "vysoka" && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[9px] font-black rounded uppercase tracking-wider">Vysoká priorita</span>
                  )}
               </div>
               <p className="text-[14px] text-[#444746] font-medium leading-relaxed">
                  {classification.summary}
               </p>
               <div className="mt-4 flex flex-wrap gap-2">
                  <div className="flex items-center gap-2 px-3 py-1 bg-white border border-indigo-100 rounded-lg text-[12px] font-bold text-indigo-700 shadow-sm">
                    <Target className="w-3 h-3" /> {classification.intent}
                  </div>
                  {classification.estimated_budget && classification.estimated_budget !== "—" && (
                     <div className="flex items-center gap-2 px-3 py-1 bg-violet-600 text-white rounded-lg text-[12px] font-bold shadow-sm">
                        <Zap className="w-3 h-3" /> {classification.estimated_budget}
                     </div>
                  )}
                  {classification.service_category && classification.service_category !== "—" && (
                     <div className="flex items-center gap-2 px-3 py-1 bg-white border border-emerald-100 text-emerald-700 rounded-lg text-[12px] font-bold shadow-sm">
                        <TrendingUp className="w-3 h-3" /> {classification.service_category}
                     </div>
                  )}
               </div>
               {classification.next_step && classification.next_step !== "—" && (
                 <div className="mt-4 p-3 bg-white/50 border border-dashed border-indigo-200 rounded-xl">
                    <p className="text-[12px] font-black text-indigo-500 uppercase tracking-widest mb-1">Odporúčaný ďalší krok</p>
                    <p className="text-[13px] font-bold text-indigo-700 italic">💡 {classification.next_step}</p>
                 </div>
               )}
            </div>
          </div>
        )}

        {/* ── Email Body Content Area ── */}
        <div className="text-[16px] leading-[1.7] text-[#111111] dark:text-zinc-100 whitespace-pre-wrap mb-12">
          {email.bodyHtml ? (
            <iframe
              srcDoc={`
                <!DOCTYPE html>
                <html>
                  <head>
                    <meta charset="utf-8">
                    <style>
                      body { 
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; 
                        font-size: 16px; 
                        line-height: 1.7; 
                        color: #111111;
                        margin: 0;
                        padding: 0;
                      }
                      a { color: #0053cc; text-decoration: none; font-weight: 500; }
                      a:hover { text-decoration: underline; }
                      img { max-width: 100%; height: auto; border-radius: 8px; }
                      table { width: 100% !important; border-collapse: collapse; margin: 20px 0; }
                      blockquote { border-left: 4px solid #e5e7eb; margin: 15px 0; padding-left: 20px; color: #4b5563; font-style: italic; }
                    </style>
                  </head>
                  <body>${email.bodyHtml}</body>
                </html>
              `}
              className="w-full h-[600px] border-none"
              title="Email Content"
              sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
            />
          ) : (
            <div className="font-sans whitespace-pre-wrap">{email.body || "(Prázdny obsah)"}</div>
          )}
        </div>

        {/* ── Attachments Section (Gmail Style) ── */}
        {email.attachments && email.attachments.length > 0 && (
          <div className="border-t border-[#f1f1f1] pt-6 mb-12">
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
                    {/* Hover Actions */}
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

        {/* ── Footer Actions (Gmail Style) ── */}
        <div className="flex items-center gap-2 pt-4">
          <button className="flex items-center gap-2.5 px-6 py-2 border border-[#dfdfdf] rounded-full text-[14px] font-bold text-[#444746] hover:bg-black/5 transition-all">
            <Reply className="w-4 h-4" /> Odpovedať
          </button>
          <button className="flex items-center gap-2.5 px-6 py-2 border border-[#dfdfdf] rounded-full text-[14px] font-bold text-[#444746] hover:bg-black/5 transition-all">
            <Forward className="w-4 h-4" /> Preposlať
          </button>
          <button className="p-2 hover:bg-black/5 rounded-full transition-all text-[#444746]">
            <Smile className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  </div>
);
}
