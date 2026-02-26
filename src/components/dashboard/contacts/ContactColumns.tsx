"use client";

import * as React from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { Lead } from "@/types/contact";
import { FlagBadge } from "./FlagBadge";
import { StatusBadge } from "./StatusBadge";
import { InlineEditableCell } from "./InlineEditableCell";
import { ContactLabelsDisplay } from "./ContactLabelsDisplay";

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
    cell: (info) => (
      <InlineEditableCell 
        id={Number(info.row.original.id)} 
        initialValue={info.getValue() || ""} 
        field="email" 
        placeholder="EMAIL"
        className="text-violet-400 font-medium"
      />
    ),
  }),
  columnHelper.accessor("phone", {
    id: "phone",
    header: "Phone",
    cell: (info) => (
      <div className="flex items-center gap-1">
        <FlagBadge phone={info.getValue()} />
        <InlineEditableCell 
          id={Number(info.row.original.id)} 
          initialValue={info.getValue() || ""} 
          field="phone" 
          placeholder="PHONE"
        />
      </div>
    ),
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
