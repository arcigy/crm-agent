"use client";

import * as React from "react";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import {
  ArrowLeft,
  Trash2,
  AlertCircle,
  Target,
  TrendingUp,
  Zap,
  Sparkles,
  Paperclip,
  Download,
  MessageSquare,
} from "lucide-react";
import { GmailMessage, GmailAttachment } from "@/types/gmail";

interface EmailDetailViewProps {
  email: GmailMessage;
  onClose: () => void;
}

export function EmailDetailView({ email, onClose }: EmailDetailViewProps) {
  const [viewMode, setViewMode] = React.useState<"html" | "text">("html");
  const [downloading, setDownloading] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (email) {
      setViewMode(email.bodyHtml ? "html" : "text");
    }
  }, [email]);

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

  const hasHtml = !!email.bodyHtml;
  const classification = email.classification;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-black text-foreground font-medium overflow-hidden">
      {/* Header Container - Full Width */}
      <div className="px-8 py-6 border-b border-black/5 dark:border-white/10 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-xl relative z-20">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onClose}
            className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-all group"
          >
            <div className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center group-hover:bg-indigo-500/10 transition-colors">
              <ArrowLeft className="w-4 h-4 group-hover:text-indigo-400" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">
              Zavrieť detail
            </span>
          </button>

          <div className="flex items-center gap-4">
            {hasHtml && (
              <div className="flex p-1 bg-black/5 dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/5">
                <button
                  onClick={() => setViewMode("html")}
                  className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === "html" ? "bg-indigo-600 text-white shadow-lg" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Visual
                </button>
                <button
                  onClick={() => setViewMode("text")}
                  className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === "text" ? "bg-indigo-600 text-white shadow-lg" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Raw Text
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl font-black shadow-2xl shadow-indigo-600/20 rotate-3">
              <div className="-rotate-3">{(email.from || "?")[0].toUpperCase()}</div>
            </div>
            <div>
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-1">Odosielateľ</p>
              <h3 className="text-xl font-black text-foreground leading-tight tracking-tight">
                {email.from || "Neznámy odosielateľ"}
              </h3>
              <p className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-1">
                {email.date
                  ? format(new Date(email.date), "d. MMMM yyyy 'o' HH:mm", {
                      locale: sk,
                    })
                  : "Neznámy dátum"}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl transition-all">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-8 py-8 bg-zinc-50/50 dark:bg-zinc-900/10 border-b border-black/5 dark:border-white/5">
        <h2 className="text-3xl font-black text-foreground italic tracking-tight leading-[1.1] max-w-4xl">
          {email.subject || "(Bez predmetu)"}
        </h2>

        {/* AI Insights Bar */}
        {classification && (
          <div
            className={`mt-8 p-6 rounded-[2rem] border animate-in fade-in slide-in-from-bottom-2 duration-500 ${classification.intent === "spam" ? "bg-red-500/5 border-red-500/20" : "bg-indigo-500/5 border-indigo-500/20"}`}
          >
            <div className="flex flex-wrap gap-2 mb-6">
              <span
                className={`flex items-center gap-2 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                  classification.intent === "spam"
                    ? "bg-red-500 text-white border-red-600"
                    : classification.priority === "vysoka"
                      ? "bg-red-500/20 text-red-500 border-red-500/30"
                      : classification.priority === "stredna"
                        ? "bg-amber-500/20 text-amber-500 border-amber-500/30"
                        : "bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
                }`}
              >
                <Sparkles className="w-3 h-3" />
                {classification.intent === "spam"
                  ? "Možný Spam"
                  : `${classification.priority} Priorita`}
              </span>

              {classification.intent !== "spam" && (
                <>
                  <span className="flex items-center gap-2 px-3 py-1 bg-black/5 dark:bg-white/5 text-[10px] font-black uppercase tracking-widest text-indigo-400 rounded-xl border border-white/10">
                    <Target className="w-3 h-3" /> {classification.intent}
                  </span>
                  {classification.service_category !== "—" && (
                    <span className="flex items-center gap-2 px-3 py-1 bg-black/5 dark:bg-white/5 text-[10px] font-black uppercase tracking-widest text-emerald-400 rounded-xl border border-white/10">
                      <TrendingUp className="w-3 h-3" />{" "}
                      {classification.service_category}
                    </span>
                  )}
                  {classification.estimated_budget && classification.estimated_budget !== "—" && (
                      <span className="flex items-center gap-2 px-3 py-1 bg-violet-600 text-[10px] font-black uppercase tracking-widest text-white rounded-xl shadow-lg shadow-violet-600/20">
                        <Zap className="w-3 h-3" /> {classification.estimated_budget}
                      </span>
                    )}
                </>
              )}
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">AI Súhrn</p>
                <p className="text-sm font-bold text-foreground leading-relaxed">
                  {classification.summary}
                </p>
              </div>
              {classification.next_step !== "—" && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Odporúčaný krok</p>
                  <p className="text-sm font-black text-indigo-500 italic">
                    {classification.next_step}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {viewMode === "html" && email.bodyHtml ? (
          <div className="w-full h-full bg-white relative">
            <iframe
              srcDoc={`
                                <!DOCTYPE html>
                                <html class="${document.documentElement.classList.contains('dark') ? 'dark' : ''}">
                                    <head>
                                        <meta charset="utf-8">
                                        <style>
                                            * { box-sizing: border-box; }
                                            body { 
                                                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
                                                font-size: 16px; 
                                                line-height: 1.7; 
                                                color: #1f2937;
                                                margin: 0;
                                                padding: 60px;
                                                max-width: 800px;
                                                margin-left: auto;
                                                margin-right: auto;
                                                background-color: #ffffff;
                                                word-wrap: break-word;
                                                overflow-wrap: break-word;
                                            }
                                            :global(.dark) body {
                                                background-color: #000000;
                                                color: #e5e7eb;
                                            }
                                            img { 
                                                max-width: 100% !important; 
                                                height: auto !important; 
                                                border-radius: 20px;
                                                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                                                margin: 2rem 0;
                                            }
                                            a { color: #6366f1; text-decoration: none; font-weight: 700; }
                                            a:hover { text-decoration: underline; }
                                            table { width: 100% !important; border-collapse: collapse; margin: 1.5rem 0; }
                                            blockquote {
                                                border-left: 4px solid #6366f1;
                                                margin: 2rem 0;
                                                padding: 0.5rem 1.5rem;
                                                background-color: rgba(99, 102, 241, 0.05);
                                                border-radius: 0 12px 12px 0;
                                                color: #4b5563;
                                                font-style: italic;
                                            }
                                        </style>
                                    </head>
                                    <body>${email.bodyHtml}</body>
                                </html>
                            `}
              className="w-full h-full border-none"
              title="Email Content"
              sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
            />
          </div>
        ) : (
          <div className="h-full overflow-y-auto bg-zinc-50 dark:bg-zinc-950">
            <div className="max-w-4xl mx-auto p-16 bg-white dark:bg-black min-h-full">
              <div className="text-[15px] text-foreground leading-loose whitespace-pre-wrap select-text font-medium opacity-90 p-8 border border-black/5 dark:border-white/5 rounded-[2rem]">
                {email.body || "(Prázdny obsah)"}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Attachments & Actions Footer */}
      <div className="px-8 py-8 border-t border-black/5 dark:border-white/10 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-xl relative z-20">
        {email.attachments && email.attachments.length > 0 && (
          <div className="mb-8">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4">
              Dostupné prílohy ({email.attachments.length})
            </p>
            <div className="flex flex-wrap gap-3">
              {email.attachments.map((att) => (
                <button
                  key={att.id}
                  onClick={() => handleDownload(att)}
                  disabled={!!downloading}
                  className="flex items-center gap-4 px-5 py-4 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl hover:bg-indigo-500/5 hover:border-indigo-500/20 transition-all group disabled:opacity-50"
                >
                  {downloading === att.id ? (
                    <div className="w-5 h-5 border-[3px] border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <div className="w-10 h-10 bg-white dark:bg-black rounded-lg flex items-center justify-center border border-black/5 dark:border-white/10 group-hover:scale-110 transition-transform">
                        <Paperclip className="w-4 h-4 text-muted-foreground group-hover:text-indigo-400" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-black text-foreground truncate max-w-[250px]">
                      {att.filename}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-0.5">
                      {(att.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                  <Download className="w-4 h-4 text-muted-foreground/30 group-hover:text-indigo-400 ml-4" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-4">
          <button className="flex-[2] h-14 bg-indigo-600 text-white rounded-[1.25rem] font-black uppercase tracking-[0.2em] shadow-2xl shadow-indigo-600/20 hover:bg-indigo-500 active:scale-95 transition-all text-[11px] flex items-center justify-center gap-3">
            <MessageSquare className="w-4 h-4" /> Napísať odpoveď
          </button>
          <button className="flex-1 h-14 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-foreground rounded-[1.25rem] font-black uppercase tracking-[0.2em] hover:bg-black/10 dark:hover:bg-white/10 active:scale-95 transition-all text-[11px] flex items-center justify-center gap-3">
            Preposlať správu
          </button>
        </div>
      </div>
    </div>
  );
}
