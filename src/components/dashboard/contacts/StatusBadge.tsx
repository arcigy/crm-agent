"use client";

import * as React from "react";
import { updateContact } from "@/app/actions/contacts";
import { toast } from "sonner";
import { Loader2, ChevronDown } from "lucide-react";

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

  const status = statuses.find(s => s.value === currentStatus) || statuses[1];

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
        // We reload to reflect the change in grouping
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
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
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

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-[100]" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 z-[101] bg-white dark:bg-slate-900 border border-border rounded-xl shadow-2xl p-1 min-w-[120px] animate-in fade-in zoom-in-95 duration-200">
            {statuses.map((s) => (
              <button
                key={s.value}
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatusChange(s.value);
                }}
                className={`
                  w-full flex items-center px-3 py-2 rounded-lg text-xs font-bold transition-colors
                  ${currentStatus === s.value ? 'bg-muted text-blue-600' : 'text-gray-500 hover:bg-muted hover:text-foreground'}
                `}
              >
                <div className={`w-1.5 h-1.5 rounded-full mr-2 ${s.color.split(' ')[0].replace('text-', 'bg-')}`} />
                {s.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
