"use client";

import * as React from "react";
import { Sparkles, X, MessageSquare } from "lucide-react";

interface QuickComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialContent: string;
  recruitName: string;
  onSend: (content: string) => void;
}

export function QuickComposerModal({
  isOpen,
  onClose,
  initialContent,
  recruitName,
  onSend,
}: QuickComposerModalProps) {
  const [content, setContent] = React.useState(initialContent);

  React.useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-violet-50/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-violet-600/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">
                AI Koncept Odpovede
              </h3>
              <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest leading-none mt-0.5">
                Pre: {recruitName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-violet-100 rounded-lg transition-colors group"
          >
            <X className="w-4 h-4 text-violet-300 group-hover:text-violet-600" />
          </button>
        </div>

        <div className="p-6">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-64 p-4 bg-violet-50/30 border-2 border-transparent focus:border-violet-100 focus:bg-white rounded-xl resize-none outline-none text-sm text-gray-700 font-medium leading-relaxed transition-all"
            placeholder="Sem napíšte odpoveď..."
            autoFocus
          />
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 text-black">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl border border-gray-200 text-gray-400 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-white hover:text-violet-600 transition-all"
          >
            Zrušiť
          </button>
          <button
            onClick={() => onSend(content)}
            className="px-8 py-3 rounded-xl bg-violet-600 text-white font-black text-[10px] uppercase tracking-[0.2em] hover:bg-violet-700 shadow-xl shadow-violet-600/30 transition-all flex items-center gap-3 active:scale-95 border border-violet-500/50"
          >
            <MessageSquare className="w-4 h-4" /> Odoslať
          </button>
        </div>
      </div>
    </div>
  );
}
