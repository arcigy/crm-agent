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
  recentEmails?: { name: string; email: string }[];
}

export function ComposeModal({ 
  isOpen, 
  onClose, 
  onSend, 
  onDraftUpdate, 
  onMinimizeAction, 
  onDraftDelete,
  initialData,
  recentEmails = []
}: ComposeModalProps) {
  const [to, setTo] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");
  const [isMaximized, setIsMaximized] = React.useState(false);
  const [isMinimized, setIsMinimized] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<{id: string; first_name: string; last_name: string; email: string}[]>([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [isProcessingAI, setIsProcessingAI] = React.useState(false);
  const [showMoreMenu, setShowMoreMenu] = React.useState(false);
  const [attachments, setAttachments] = React.useState<File[]>([]);
  const suggestionsRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const subjectRef = React.useRef<HTMLInputElement>(null);

  const isMinimizedRef = React.useRef(isMinimized);
  const [activeTransition, setActiveTransition] = React.useState("all 0.4s cubic-bezier(0.16, 1, 0.3, 1)");

  React.useEffect(() => {
    if (!isOpen) {
      setIsMaximized(false);
      setIsMinimized(false);
    } else {
      if (initialData) {
        setTo(initialData.to || "");
        setSubject(initialData.subject || "");
        setBody(initialData.body || "");
      }
      
      // If we have a recipient but no subject, focus subject
      if (initialData?.to && !initialData.subject) {
        // Longer timeout to ensure the modal is fully rendered and inputs aren't grabbing focus
        const t = setTimeout(() => {
            if (subjectRef.current) {
                subjectRef.current.focus();
                // Move cursor to end just in case
                const length = subjectRef.current.value.length;
                subjectRef.current.setSelectionRange(length, length);
            }
        }, 150);
        return () => clearTimeout(t);
      } else if (!initialData?.to) {
        // If no recipient, focus recipient
        // We'll use a small timeout for this too to be consistent
        const t = setTimeout(() => {
            const recipientInput = document.querySelector('input[placeholder="Meno alebo e-mail..."]') as HTMLInputElement;
            if (recipientInput) recipientInput.focus();
        }, 150);
        return () => clearTimeout(t);
      }
    }
  }, [isOpen, initialData]);

  React.useEffect(() => {
    if (isOpen) {
      onDraftUpdate?.({ to, subject, body });
    }
  }, [to, subject, body]);

  // Debounced contact search + Local merge
  React.useEffect(() => {
    if (to.length < 1) { 
      setSuggestions([]); 
      setShowSuggestions(false); 
      return; 
    }

    const searchStr = to.toLowerCase();

    // 1. Local filter from recentEmails
    const localMatches = recentEmails
      .filter(entry => 
        entry.email.toLowerCase().includes(searchStr) || 
        (entry.name && entry.name.toLowerCase().includes(searchStr))
      )
      .slice(0, 5)
      .map(entry => ({
        id: `recent-${entry.email}`,
        first_name: entry.name || entry.email.split('@')[0],
        last_name: '',
        email: entry.email
      }));

    if (to.length < 2) {
      if (localMatches.length > 0) {
        setSuggestions(localMatches);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/contacts?q=${encodeURIComponent(to)}`);
        const data = await res.json();
        const apiContacts = data.contacts || [];

        // Merge and deduplicate
        const merged = [...localMatches];
        apiContacts.forEach((ac: any) => {
          if (!merged.some(m => m.email.toLowerCase() === ac.email.toLowerCase())) {
            merged.push(ac);
          }
        });

        if (merged.length > 0) {
          setSuggestions(merged);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } catch (err) { 
        console.error("Search error:", err);
        if (localMatches.length > 0) {
          setSuggestions(localMatches);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
        }
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [to, recentEmails]);

  const handleAIRefine = async () => {
    if (!body.trim()) {
      toast.error("Napíšte najprv nejaký text, ktorý mám vylepšiť.");
      return;
    }
    setIsProcessingAI(true);
    const toastId = toast.loading("AI vylepšuje váš text...");
    try {
      const res = await fetch('/api/ai/refine-email', {
        method: 'POST',
        body: JSON.stringify({ body })
      });
      const data = await res.json();
      if (data.refinedBody) {
        setBody(data.refinedBody);
        toast.success("Text bol profesionálne vylepšený ✨", { id: toastId });
      } else {
        throw new Error();
      }
    } catch (err) {
      toast.error("Nepodarilo sa vylepšiť text. Skúste to neskôr.", { id: toastId });
    } finally {
      setIsProcessingAI(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setAttachments(prev => [...prev, ...newFiles]);
      toast.success(`${newFiles.length} súbor(ov) priložených`);
    }
  };

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
          {/* Recipient with autocomplete */}
          <div className="relative">
            <div className="flex items-center px-5 py-3 rounded-full border border-violet-500/30 bg-transparent focus-within:border-violet-500/70 transition-colors">
              <span className="text-[13px] font-medium text-white/40 w-16 shrink-0 tracking-wide">Komu</span>
              <input
                type="text"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                className="flex-1 !bg-transparent border-none outline-none focus:ring-0 appearance-none text-white text-[13px] font-medium placeholder:text-white/20"
                style={{ backgroundColor: "transparent", boxShadow: "none" }}
                placeholder="Meno alebo e-mail..."
              />
            </div>
            {/* Autocomplete dropdown - Premium Design */}
            {showSuggestions && suggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute left-0 right-0 top-full mt-2 z-[200] rounded-2xl overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200"
                style={{
                  background: "rgba(10, 10, 14, 0.92)",
                  border: "1px solid rgba(139, 92, 246, 0.3)",
                  boxShadow: "0 20px 50px rgba(0,0,0,0.6), 0 0 20px rgba(139, 92, 246, 0.15)",
                }}
              >
                <div className="max-h-[280px] overflow-y-auto thin-scrollbar">
                  {suggestions.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onMouseDown={() => {
                        setTo(c.email);
                        setShowSuggestions(false);
                      }}
                      className="w-full flex items-center gap-4 px-5 py-2.5 hover:bg-violet-600/20 transition-all text-left border-b border-white/[0.03] last:border-none group"
                    >
                      {/* Premium Circular Avatar - Smaller */}
                      <div className="relative shrink-0 group-hover:scale-110 transition-transform duration-300">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-black text-white relative z-10"
                          style={{
                            background: `linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)`,
                            boxShadow: "inset 0 1px 2px rgba(255,255,255,0.3), 0 4px 8px rgba(0,0,0,0.3)"
                          }}
                        >
                          {(c.first_name?.[0] || '?').toUpperCase()}
                        </div>
                        {/* Outer Glow Ring */}
                        <div className="absolute inset-[-2px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                          style={{
                            background: "linear-gradient(135deg, #8b5cf6, #d946ef)",
                            filter: "blur(3px)",
                            zIndex: 0
                          }}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between flex-1 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-zinc-100 text-[13px] font-bold tracking-tight group-hover:text-white transition-colors truncate shrink-0">
                            {c.first_name} {c.last_name}
                          </span>
                          <span className="text-zinc-500 text-[11px] font-medium tracking-tight truncate group-hover:text-violet-300/70 transition-colors">
                            {c.email}
                          </span>
                        </div>
                        
                        {/* Status Badge */}
                        {String(c.id).startsWith('recent-') ? (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 animate-in fade-in duration-300">
                            <div className="w-1 h-1 rounded-full bg-violet-400 group-hover:animate-pulse" />
                            <span className="text-[9px] font-black text-violet-400 uppercase tracking-widest">Známy</span>
                          </div>
                        ) : (
                          <div className="flex items-center px-2 py-0.5 rounded-full bg-white/5 border border-white/10 opacity-40 group-hover:opacity-100 transition-opacity">
                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Nový</span>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Subject */}
          <div className="flex items-center px-5 py-3 rounded-full border border-violet-500/30 bg-transparent focus-within:border-violet-500/70 transition-colors">
            <span className="text-[13px] font-medium text-white/40 w-16 shrink-0 tracking-wide">Predmet</span>
            <input
              ref={subjectRef}
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
              className="w-full h-full !bg-transparent border-none outline-none focus:ring-0 appearance-none text-white text-[13px] font-medium resize-none placeholder:text-white/20 leading-relaxed thin-scrollbar overflow-y-auto"
              style={{ backgroundColor: "transparent", boxShadow: "none" }}
            />
          </div>

          {/* Attachments List */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 px-2">
              {attachments.map((file, idx) => (
                <div key={idx} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] text-white/60">
                  <Paperclip className="w-3 h-3" />
                  <span className="truncate max-w-[120px]">{file.name}</span>
                  <button onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))} className="hover:text-red-400">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
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
            
            <button 
              onClick={handleAIRefine}
              disabled={isProcessingAI}
              className={`p-2 ml-2 transition-all duration-200 text-white/40 hover:text-white hover:bg-white/10 rounded-full ${isProcessingAI ? 'animate-pulse' : ''}`}
              title="AI Vylepšiť text"
            >
              <span className="font-serif italic font-bold text-[15px] px-1">A</span>
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-2 transition-all duration-200 text-white/40 hover:text-white hover:bg-white/10 rounded-full"
              title="Priložiť súbor"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              multiple 
              onChange={handleFileChange} 
            />
          </div>

          <div className="flex items-center gap-1 relative">
            <button 
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="p-2 transition-all duration-200 text-white/40 hover:text-white hover:bg-white/10 rounded-full"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMoreMenu && (
              <div className="absolute bottom-full right-0 mb-2 w-48 rounded-xl bg-[#0f0f14] border border-white/10 shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-bottom-2">
                <button 
                  onClick={() => { setShowMoreMenu(false); toast.info("Uložené ako šablóna"); }}
                  className="w-full px-4 py-2 text-left text-[13px] text-white/70 hover:bg-white/5 hover:text-white"
                >
                  Uložiť ako šablónu
                </button>
                <button 
                  onClick={() => { setShowMoreMenu(false); toast.info("Odoslanie naplánované na zajtra ráno"); }}
                  className="w-full px-4 py-2 text-left text-[13px] text-white/70 hover:bg-white/5 hover:text-white"
                >
                  Naplánovať odoslanie
                </button>
              </div>
            )}

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
