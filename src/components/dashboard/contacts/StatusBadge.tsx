"use client";

import * as React from "react";
import { updateContact } from "@/app/actions/contacts";
import { toast } from "sonner";
import { Loader2, ChevronDown } from "lucide-react";

import { createPortal } from "react-dom";

interface StatusBadgeProps {
  contactId: number;
  currentStatus: string;
}

const statuses = [
  { value: "active", label: "Active", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
  { value: "lead", label: "Lead", color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  { value: "archived", label: "Archived", color: "text-slate-500 bg-slate-500/10 border-slate-500/20" },
];

export function StatusBadge({ contactId, currentStatus }: StatusBadgeProps) {
  const [loading, setLoading] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const [coords, setCoords] = React.useState({ top: 0, left: 0, width: 0 });
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  const status = statuses.find(s => s.value === currentStatus) || statuses[1];

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
    setIsOpen(!isOpen);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentStatus) {
      setIsOpen(false);
      return;
    }

    setLoading(true);
    setIsOpen(false);
    
    try {
      const res = await updateContact(contactId, { status: newStatus });
      if (res.success) {
        toast.success(`Status zmenený na ${newStatus}`);
        window.location.reload();
      } else {
        toast.error(res.error || "Chyba pri zmene statusu");
        setLoading(false);
      }
    } catch (err) {
      toast.error("Zlyhalo pripojenie");
      setLoading(false);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        onClick={handleOpen}
        disabled={loading}
        className={`
          flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all active:scale-95
          ${status.color}
          ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-95'}
        `}
      >
        {loading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <>
            {status.label}
            <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>

      {isOpen && createPortal(
        <div className="fixed inset-0 z-[9999]">
          <div 
            className="absolute inset-0 bg-transparent" 
            onClick={() => setIsOpen(false)}
          />
          <div 
            style={{ 
              top: coords.top + 8, 
              left: coords.left,
              minWidth: Math.max(140, coords.width)
            }}
            className="absolute z-[10000] bg-[#0a0a0c] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] p-1.5 animate-in fade-in zoom-in-95 duration-200"
          >
            {statuses.map((s) => (
              <button
                key={s.value}
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatusChange(s.value);
                }}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                  ${currentStatus === s.value ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20' : 'text-white/40 hover:bg-white/5 hover:text-white'}
                `}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${s.value === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : s.value === 'lead' ? 'bg-blue-500' : 'bg-zinc-500'}`} />
                {s.label}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
