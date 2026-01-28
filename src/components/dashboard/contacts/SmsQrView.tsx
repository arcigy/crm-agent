"use client";

import * as React from "react";
import { MessageSquare, X, ArrowRight, Sparkles } from "lucide-react";
import { Lead } from "@/types/contact";
import { QRCodeSVG } from "qrcode.react";

interface SmsQrViewProps {
  contact: Lead;
  onClose: () => void;
}

export function SmsQrView({ contact, onClose }: SmsQrViewProps) {
  const [draftBody, setDraftBody] = React.useState("");

  return (
    <div className="flex flex-col h-full bg-white animate-in slide-in-from-bottom duration-300">
      <div className="h-16 border-b border-gray-100 flex items-center justify-between px-6 shrink-0 bg-white">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
            <MessageSquare className="w-4 h-4" />
          </div>
          Draft SMS to QR
        </h3>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 flex flex-col p-8 gap-8 items-center justify-center bg-slate-50 overflow-y-auto">
        <div className="flex w-full max-w-5xl gap-12 h-full flex-col md:flex-row items-center">
          <div className="flex-[2] w-full flex flex-col gap-4">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 flex-1 flex flex-col min-h-[250px]">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-3">
                Type your SMS here
              </label>
              <textarea
                className="flex-1 w-full bg-transparent outline-none resize-none text-lg text-gray-800 placeholder:text-gray-300 leading-relaxed"
                placeholder="Hello, regarding our meeting..."
                value={draftBody}
                onChange={(e) => setDraftBody(e.target.value)}
              />
              <div className="flex justify-between items-center pt-4 border-t border-gray-100 mt-2">
                <span className="text-xs font-bold text-gray-400">
                  {draftBody.length} chars
                </span>
                <button className="flex items-center gap-1 text-purple-600 text-xs font-bold">
                  <Sparkles className="w-3 h-3" /> AI Help
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center text-gray-300 hidden md:block">
            <ArrowRight className="w-8 h-8" />
          </div>

          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="bg-white p-4 rounded-3xl shadow-xl border border-gray-100">
              <QRCodeSVG
                value={`sms:${contact.phone}?body=${encodeURIComponent(draftBody)}`}
                size={160}
                level="M"
                includeMargin={true}
              />
            </div>
            <div className="mt-8 text-center space-y-2">
              <h3 className="text-lg font-black text-gray-900">Scan to Send</h3>
              <p className="text-sm text-gray-500 max-w-[200px] mx-auto">
                Open Camera app on your phone and scan this code to open SMS.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
