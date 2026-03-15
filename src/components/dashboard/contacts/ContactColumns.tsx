"use client";

import * as React from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { Lead } from "@/types/contact";
import { FlagBadge } from "./FlagBadge";
import { StatusBadge } from "./StatusBadge";
import { InlineEditableCell } from "./InlineEditableCell";
import { ContactLabelsDisplay } from "./ContactLabelsDisplay";
import { Mail } from "lucide-react";
import { useRouter } from "next/navigation";

const EmailCell = ({ email, id }: { email: string; id: number }) => {
  const router = useRouter();
  const handleCompose = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/dashboard/leads?compose=${encodeURIComponent(email)}`);
  };

  const handlePrefetch = () => {
    router.prefetch(`/dashboard/leads?compose=${encodeURIComponent(email)}`);
  };

  return (
    <div className="flex items-center gap-2 group/email-cell w-full">
      <InlineEditableCell 
        id={id} 
        initialValue={email} 
        field="email" 
        placeholder="EMAIL"
        className="text-violet-400 font-medium"
      />
      {email && (
        <button 
            onClick={handleCompose}
            onMouseEnter={handlePrefetch}
            className="opacity-0 group-hover/email-cell:opacity-100 p-1 hover:bg-violet-500/20 rounded-md transition-all text-violet-400 shrink-0"
            title="Poslať email"
        >
            <Mail className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

const columnHelper = createColumnHelper<Lead>();

export const contactColumns = [
  columnHelper.accessor("first_name", {
    id: "contact",
    header: "Contact",
    minSize: 120,
    cell: (info) => {
      const fn = info.row.original.first_name || "";
      const ln = info.row.original.last_name || "";
      const initials = (fn[0] || "") + (ln[0] || "");
      const labels = (info.row.original as any).labels || [];
      return (
        <div className="flex items-center gap-2 group/name">
          <div 
            className="w-7 h-7 shrink-0 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 border border-violet-500/30 flex items-center justify-center text-[10px] font-black text-white shadow-lg shadow-violet-900/20 transition-transform duration-300 hover:scale-110 cursor-pointer"
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent("open-contact-detail", {
                  detail: info.row.original,
                }),
              );
            }}
          >
            {initials.toUpperCase()}
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
             <div className="flex items-center">
                <InlineEditableCell 
                  id={Number(info.row.original.id)} 
                  initialValue={fn} 
                  field="first_name" 
                  placeholder="MENO"
                />
                <InlineEditableCell 
                  id={Number(info.row.original.id)} 
                  initialValue={ln} 
                  field="last_name" 
                  placeholder="PRIEZVISKO"
                />
             </div>
             <ContactLabelsDisplay labels={labels} />
          </div>
        </div>
      );
    },
  }),
  columnHelper.accessor("email", {
    id: "email",
    header: "Email",
    cell: (info) => {
      const email = info.getValue() || "";
      return (
        <div className="flex items-center gap-2 h-full w-full">
           <EmailCell email={email} id={Number(info.row.original.id)} />
        </div>
      );
    },
  }),
  columnHelper.accessor("phone", {
    id: "phone",
    header: "Phone",
    cell: (info) => {
      const phone = info.getValue() || "";
      return (
        <div 
          className="flex items-center gap-1 cursor-pointer group/phone-cell hover:bg-white/5 py-1 px-1 -ml-1 rounded-md transition-all border border-transparent hover:border-white/5"
          onClick={(e) => {
            e.stopPropagation();
            if (phone) {
              window.dispatchEvent(
                new CustomEvent("open-qr", {
                  detail: phone.replace(/[^0-9+]/g, ''),
                }),
              );
            }
          }}
        >
          <FlagBadge phone={phone} />
          <span className={`text-[13px] font-bold truncate ${phone ? 'text-zinc-100 group-hover/phone-cell:text-white' : 'text-white/20 italic'}`}>
            {phone || "PHONE"}
          </span>
        </div>
      );
    },
  }),
  columnHelper.accessor("company", {
    id: "company",
    header: "Spoločnosť",
    cell: (info) => (
      <InlineEditableCell 
        id={Number(info.row.original.id)} 
        initialValue={info.getValue() || ""} 
        field="company" 
        placeholder="COMPANY"
      />
    ),
  }),
  columnHelper.accessor("status", {
    id: "status",
    header: "Status",
    cell: (info) => (
      <StatusBadge 
        contactId={Number(info.row.original.id)} 
        currentStatus={info.getValue() || ""} 
      />
    ),
  }),
  columnHelper.accessor("comments", {
    id: "comments",
    header: "Poznámky",
    cell: (info) => (
      <InlineEditableCell 
        id={Number(info.row.original.id)} 
        initialValue={info.getValue() || ""} 
        field="comments" 
        placeholder="PRIDAŤ POZNÁMKU..."
      />
    ),
  }),
];
