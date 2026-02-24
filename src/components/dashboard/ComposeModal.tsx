"use client";

import * as React from "react";
import { X, Send, Paperclip, MoreVertical, Minimize2, Maximize2, Trash2, Minus } from "lucide-react";
import { toast } from "sonner";

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (data: { to: string; subject: string; body: string }) => void;
  onDraftUpdate?: (data: { to: string; subject: string; body: string }) => void;
  onMinimizeAction?: () => void;
  onDraftDelete?: () => void;
  initialData?: { to: string; subject: string; body: string };
}

export function ComposeModal({ 
  isOpen, 
  onClose, 
  onSend, 
  onDraftUpdate, 
  onMinimizeAction, 
  onDraftDelete,
  initialData
}: ComposeModalProps) {
  const [to, setTo] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");
  const [isMaximized, setIsMaximized] = React.useState(false);
  const [isMinimized, setIsMinimized] = React.useState(false);

  const isMinimizedRef = React.useRef(isMinimized);
  const [activeTransition, setActiveTransition] = React.useState("all 0.4s cubic-bezier(0.16, 1, 0.3, 1)");

  React.useEffect(() => {
    if (!isOpen) {
      setIsMaximized(false);
      setIsMinimized(false);
    } else if (initialData) {
      setTo(initialData.to || "");
      setSubject(initialData.subject || "");
      setBody(initialData.body || "");
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (isOpen) {
      onDraftUpdate?.({ to, subject, body });
    }
  }, [to, subject, body]);

  React.useEffect(() => {
    if (isMinimized && !isMinimizedRef.current) {
      // becoming minimized: width first (delay 0), then height (delay 0.3)
      setActiveTransition("width 0.3s ease-in-out, height 0.3s ease-in-out 0.3s, background 0.3s, border-radius 0.3s, right 0.3s, box-shadow 0.3s");
    } else if (!isMinimized && isMinimizedRef.current) {
      // restoring from minimized: height first (delay 0), then width (delay 0.3)
      setActiveTransition("height 0.3s ease-in-out, width 0.3s ease-in-out 0.3s, background 0.3s, border-radius 0.3s, right 0.3s, box-shadow 0.3s");
      // restore default transition after animation completes
      const t = setTimeout(() => setActiveTransition("all 0.4s cubic-bezier(0.16, 1, 0.3, 1)"), 650);
      isMinimizedRef.current = isMinimized;
      return () => clearTimeout(t);
    }
    isMinimizedRef.current = isMinimized;
  }, [isMinimized]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed z-[150] overflow-hidden"
      style={{
        bottom: 0,
        right: isMaximized ? "0px" : "56px",
        width: isMaximized ? "100vw" : isMinimized ? "260px" : "800px",
        height: isMaximized ? "100vh" : isMinimized ? "48px" : "600px",
        borderRadius: isMaximized ? "0" : isMinimized ? "0.75rem 0.75rem 0 0" : "1.5rem 1.5rem 0 0",
        background: isMinimized ? "#0a0a0c" : "#000000",
        border: "1px solid rgba(167,139,250,0.3)",
        borderBottom: "none",
        boxShadow: isMinimized 
          ? "0 -5px 20px rgba(0,0,0,0.5), 0 0 15px rgba(124,58,237,0.2)"
          : "0 -10px 40px rgba(0,0,0,0.5), 0 0 30px rgba(124,58,237,0.15), inset 0 1px 0 rgba(196,181,253,0.1)",
        transition: activeTransition,
        cursor: isMinimized ? "pointer" : "default"
      }}
      onClick={() => {
        if (isMinimized) {
          setIsMinimized(false);
        }
      }}
    >
      {/* Minimized HUD (Fades In) */}
      <div 
        className="absolute inset-0 flex items-center justify-between px-4 z-20"
        style={{ 
          opacity: isMinimized ? 1 : 0, 
          transition: isMinimized ? "opacity 0.3s ease 0.3s" : "opacity 0.2s ease",
          pointerEvents: isMinimized ? "auto" : "none" 
        }}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse shrink-0" />
          <span className="text-white text-[13px] font-bold truncate">
            {subject || to || "Nová správa"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button 
            className="p-1 hover:bg-white/10 rounded-md transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            <X className="w-3.5 h-3.5 text-white/50 hover:text-red-400" />
          </button>
        </div>
      </div>

      {/* Full Content (Fades Out quickly when minimizing) */}
      <div 
        className="absolute top-0 right-0 flex flex-col z-10"
        style={{ 
          width: isMaximized ? "100vw" : "800px",
          height: isMaximized ? "100vh" : "600px",
          opacity: isMinimized ? 0 : 1, 
          transition: "opacity 0.3s ease",
          pointerEvents: isMinimized ? "none" : "auto" 
        }}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between px-6 py-4 cursor-pointer group border-b border-white/[0.05]" 
          onClick={() => setIsMaximized(!isMaximized)}
        >
          <span className="font-bold text-white text-[13px] tracking-wide ml-1">Nová správa</span>
          <div className="flex items-center gap-1 z-50">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toast.success("Správa bola uložená do konceptov");
                setIsMinimized(true);
                onMinimizeAction?.();
              }}
              className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-white/50 hover:text-white"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMaximized(!isMaximized);
              }}
              className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-white/50 hover:text-white"
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1.5 hover:bg-red-500/20 rounded-md transition-colors text-white/50 hover:text-red-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Inputs Section */}
        <div className="flex flex-col flex-1 px-5 py-4 gap-3 bg-transparent">
          {/* Recipient */}
          <div className="flex items-center px-5 py-3 rounded-full border border-violet-500/30 bg-transparent focus-within:border-violet-500/70 transition-colors">
            <span className="text-[13px] font-medium text-white/40 w-16 shrink-0 tracking-wide">Komu</span>
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="flex-1 !bg-transparent border-none outline-none focus:ring-0 appearance-none text-white text-[13px] font-medium placeholder:text-white/20"
              style={{ backgroundColor: "transparent", boxShadow: "none" }}
              autoFocus
            />
          </div>

          {/* Subject */}
          <div className="flex items-center px-5 py-3 rounded-full border border-violet-500/30 bg-transparent focus-within:border-violet-500/70 transition-colors">
            <span className="text-[13px] font-medium text-white/40 w-16 shrink-0 tracking-wide">Predmet</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="flex-1 !bg-transparent border-none outline-none focus:ring-0 appearance-none text-white text-[13px] font-medium placeholder:text-white/20"
              style={{ backgroundColor: "transparent", boxShadow: "none" }}
            />
          </div>

          {/* Body */}
          <div className="flex-1 mt-1 rounded-[1.5rem] border border-violet-500/30 bg-transparent focus-within:border-violet-500/70 transition-colors p-5 flex flex-col">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Vaša správa..."
              className="w-full h-full !bg-transparent border-none outline-none focus:ring-0 appearance-none text-white text-[13px] font-medium resize-none placeholder:text-white/20 leading-relaxed"
              style={{ backgroundColor: "transparent", boxShadow: "none" }}
            />
          </div>
        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.05] bg-transparent">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSend({ to, subject, body })}
              className="flex items-center gap-0 rounded-[1rem] overflow-hidden group hover:scale-[1.02] active:scale-[0.98] transition-all"
              style={{
                background: "linear-gradient(135deg, rgba(124,58,237,1) 0%, rgba(109,40,217,1) 100%)",
                boxShadow: "0 4px 15px rgba(124,58,237,0.3)",
              }}
            >
              <div className="px-5 py-2.5 text-white text-[13px] font-bold tracking-wider uppercase border-r border-black/20 hover:bg-white/10 transition-colors">
                Odoslať
              </div>
              <div className="px-3 py-2.5 hover:bg-white/10 transition-colors flex items-center justify-center">
                <ChevronDown className="w-4 h-4 text-white" />
              </div>
            </button>
            
            <button className="p-2 ml-2 transition-all duration-200 text-white/40 hover:text-white hover:bg-white/10 rounded-full">
              <span className="font-serif italic font-bold text-[15px] px-1">A</span>
            </button>
            <button className="p-2 transition-all duration-200 text-white/40 hover:text-white hover:bg-white/10 rounded-full">
              <Paperclip className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button className="p-2 transition-all duration-200 text-white/40 hover:text-white hover:bg-white/10 rounded-full">
              <MoreVertical className="w-4 h-4" />
            </button>
            <button 
              onClick={() => {
                onDraftDelete?.();
                onClose();
              }} 
              className="p-2 transition-all duration-200 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-full"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChevronDown(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
