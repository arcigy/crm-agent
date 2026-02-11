"use client";

import * as React from "react";
import { Mail, X, Paperclip, Send, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import RichTextEditor from "../editor/RichTextEditor";
import { Lead } from "@/types/contact";

interface EmailComposerViewProps {
  contact: Lead;
  onClose: () => void;
  initialSubject?: string;
  initialBody?: string;
}

export function EmailComposerView({
  contact,
  onClose,
  initialSubject = "",
  initialBody = "",
}: EmailComposerViewProps) {
  const [subject, setSubject] = React.useState(initialSubject);
  const [body, setBody] = React.useState(initialBody);
  const [isSending, setIsSending] = React.useState(false);

  const handleSend = async () => {
    if (!subject || !body) {
      toast.error("Please fill in both subject and body");
      return;
    }

    setIsSending(true);
    const toastId = toast.loading("Odosielam email...");
    try {
      // We need a server action to send this email via Google API
      // I'll check if we have one or if I should use a new one.
      // Actions like sendColdLeadEmail already exists, but it's for automated sending.
      // Let's use a generic email sender.
      const { sendGeneralEmail } = await import("@/app/actions/google-email");
      const res = await sendGeneralEmail({
        to: contact.email || "",
        subject,
        body
      });

      if (res.success) {
        toast.success("Email odoslaný", { id: toastId });
        onClose();
      } else {
        toast.error(res.error || "Chyba pri odosielaní", { id: toastId });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Chyba", { id: toastId });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white animate-in slide-in-from-bottom duration-300">
      <div className="h-16 border-b border-gray-100 flex items-center justify-between px-6 shrink-0 bg-white">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <Mail className="w-4 h-4" />
          </div>
          New Message
        </h3>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 flex flex-col bg-white overflow-y-auto">
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">
              To
            </label>
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
              <span className="text-sm font-bold text-gray-900">
                {contact.first_name} {contact.last_name}
              </span>
              <span className="text-xs text-gray-400">
                &lt;{contact.email}&gt;
              </span>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">
              Subject
            </label>
            <input
              className="w-full text-sm font-bold text-gray-900 border-b border-gray-200 py-2 outline-none focus:border-blue-500"
              placeholder="Enter subject..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="flex-1 flex flex-col min-h-[400px]">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-3 flex justify-between items-center px-1">
              Message Content
              <button className="flex items-center gap-1.5 text-blue-600 font-black text-[10px] uppercase tracking-wider hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-all">
                <Sparkles className="w-3.5 h-3.5 fill-current" />
                AI Rewrite
              </button>
            </label>
            <div className="flex-1 flex flex-col">
                <RichTextEditor
                    content={body}
                    onChange={setBody}
                    placeholder="Začnite písať váš email..."
                />
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-white shrink-0">
        <div className="flex gap-2">
          <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg">
            <Paperclip className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg"
          >
            Discard
          </button>
          <button 
            disabled={isSending}
            onClick={handleSend}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg active:scale-95 transition-all disabled:opacity-50"
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Message"} <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
