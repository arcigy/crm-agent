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
    <div className="flex flex-col h-full bg-white text-gray-700 font-medium">
      {/* Header Container - Full Width */}
      <div className="px-6 py-4 border-b border-gray-100 bg-white">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs font-black uppercase tracking-wider">
              Späť
            </span>
          </button>

          <div className="flex items-center gap-2">
            {hasHtml && (
              <div className="flex p-1 bg-gray-100/80 rounded-lg">
                <button
                  onClick={() => setViewMode("html")}
                  className={`px-3 py-1 text-[10px] font-black uppercase tracking-tighter rounded-md transition-all ${viewMode === "html" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
                >
                  HTML
                </button>
                <button
                  onClick={() => setViewMode("text")}
                  className={`px-3 py-1 text-[10px] font-black uppercase tracking-tighter rounded-md transition-all ${viewMode === "text" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
                >
                  TEXT
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-sm font-black shadow-lg shadow-blue-200">
            {(email.from || "?")[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-black text-gray-900 leading-tight truncate max-w-[400px]">
              {email.from || "Neznámy odosielateľ"}
            </h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
              {email.date
                ? format(new Date(email.date), "d. MMM yyyy HH:mm", {
                    locale: sk,
                  })
                : "Neznámy dátum"}
            </p>
          </div>
        </div>

        <h2 className="text-xl font-black text-gray-900 leading-tight mb-6">
          {email.subject || "(Bez predmetu)"}
        </h2>

        {/* AI Insights Bar - if exists */}
        {classification && (
          <div
            className={`p-6 rounded-2xl border mb-6 ${classification.intent === "spam" ? "bg-red-50/30 border-red-100" : "bg-gray-50/50 border-gray-100"}`}
          >
            <div className="flex flex-wrap gap-3 mb-4">
              <span
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${
                  classification.intent === "spam"
                    ? "bg-red-600 text-white border-red-700 shadow-sm"
                    : classification.priority === "vysoka"
                      ? "bg-red-50 text-red-700 border-red-100"
                      : classification.priority === "stredna"
                        ? "bg-amber-50 text-amber-700 border-amber-100"
                        : "bg-blue-50 text-blue-700 border-blue-100"
                }`}
              >
                {classification.intent === "spam" ? (
                  <Trash2 className="w-2.5 h-2.5" />
                ) : (
                  <AlertCircle className="w-2.5 h-2.5" />
                )}
                {classification.intent === "spam"
                  ? "Nerelevantné / Spam"
                  : `${classification.priority} priorita`}
              </span>

              {classification.intent !== "spam" && (
                <>
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-white text-[9px] font-black uppercase tracking-widest text-indigo-700 rounded-md border border-indigo-100">
                    <Target className="w-2.5 h-2.5" /> {classification.intent}
                  </span>
                  {classification.service_category !== "—" && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-white text-[9px] font-black uppercase tracking-widest text-emerald-700 rounded-md border border-emerald-100">
                      <TrendingUp className="w-2.5 h-2.5" />{" "}
                      {classification.service_category}
                    </span>
                  )}
                  {classification.estimated_budget !== "—" &&
                    classification.estimated_budget !== "Neznámy" && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-green-600 text-[9px] font-black uppercase tracking-widest text-white rounded-md shadow-sm">
                        <Zap className="w-2.5 h-2.5" /> Budget:{" "}
                        {classification.estimated_budget}
                      </span>
                    )}
                </>
              )}
            </div>
            <div className="flex items-start gap-2 bg-white/60 p-2 rounded-lg border border-white">
              <Sparkles
                className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${classification.intent === "spam" ? "text-gray-400" : "text-blue-500"}`}
              />
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-gray-800 leading-tight mb-1">
                  {classification.summary}
                </p>
                {classification.next_step !== "—" && (
                  <p className="text-[9px] font-medium text-blue-700 uppercase tracking-wide">
                    💡 Odporúčaný krok: {classification.next_step}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden bg-white">
        {viewMode === "html" && email.bodyHtml ? (
          <div className="w-full h-full bg-white relative">
            <iframe
              srcDoc={`
                                <!DOCTYPE html>
                                <html>
                                    <head>
                                        <meta charset="utf-8">
                                        <style>
                                            * { box-sizing: border-box; }
                                            body { 
                                                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
                                                font-size: 15px; 
                                                line-height: 1.6; 
                                                color: #1f2937;
                                                margin: 0;
                                                padding: 40px;
                                                max-width: 900px;
                                                margin-left: auto;
                                                margin-right: auto;
                                                background-color: #ffffff;
                                                word-wrap: break-word;
                                                overflow-wrap: break-word;
                                            }
                                            img { 
                                                max-width: 100% !important; 
                                                height: auto !important; 
                                                border-radius: 12px;
                                                box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                                                margin: 1rem 0;
                                            }
                                            a { color: #2563eb; text-decoration: none; font-weight: 600; }
                                            a:hover { text-decoration: underline; }
                                            table { max-width: 100% !important; border-collapse: collapse; }
                                            blockquote {
                                                border-left: 4px solid #e5e7eb;
                                                margin: 1.5rem 0;
                                                padding-left: 1.5rem;
                                                color: #6b7280;
                                                font-style: italic;
                                            }
                                            /* Fix for some emails with huge font sizes */
                                            @media only screen and (max-width: 600px) {
                                                body { padding: 20px; }
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
          <div className="h-full overflow-y-auto bg-gray-50/30">
            <div className="max-w-4xl mx-auto p-12 bg-white min-h-full shadow-sm border-x border-gray-100/50">
              <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap select-text font-mono opacity-90">
                {email.body || "(Prázdny obsah)"}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Attachments & Actions Footer */}
      <div className="p-6 border-t border-gray-100 bg-gray-50">
        {email.attachments && email.attachments.length > 0 && (
          <div className="mb-6">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
              Prílohy ({email.attachments.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {email.attachments.map((att) => (
                <button
                  key={att.id}
                  onClick={() => handleDownload(att)}
                  disabled={!!downloading}
                  className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all group disabled:opacity-50 text-left"
                >
                  {downloading === att.id ? (
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Paperclip className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                  )}
                  <div>
                    <p className="text-sm font-bold text-gray-900 truncate max-w-[200px]">
                      {att.filename}
                    </p>
                    <p className="text-[10px] text-gray-500 font-medium">
                      {(att.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                  <Download className="w-4 h-4 text-gray-300 group-hover:text-blue-500 ml-2" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-4">
          <button className="flex-1 h-12 bg-gray-900 text-white rounded-xl font-black uppercase tracking-widest shadow-xl hover:bg-black hover:scale-[1.02] active:scale-95 transition-all text-xs flex items-center justify-center gap-2">
            <MessageSquare className="w-4 h-4" /> Odpovedať
          </button>
          <button className="flex-1 h-12 bg-white border border-gray-200 text-gray-900 rounded-xl font-black uppercase tracking-widest hover:bg-gray-50 hover:border-gray-300 active:scale-95 transition-all text-xs flex items-center justify-center gap-2">
            Preposlať
          </button>
        </div>
      </div>
    </div>
  );
}
