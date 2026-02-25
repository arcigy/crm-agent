"use client";

import * as React from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { Lead } from "@/types/contact";
import { FlagBadge } from "./FlagBadge";
import { EditableComment } from "./EditableComment";
import { StatusBadge } from "./StatusBadge";
import { ContactLabelsDisplay } from "./ContactLabelsDisplay";

const columnHelper = createColumnHelper<Lead>();

export const contactColumns = [
  columnHelper.accessor("first_name", {
    id: "contact",
    header: "Contact",
    cell: (info) => {
      const fn = info.row.original.first_name || "";
      const ln = info.row.original.last_name || "";
      const initials = (fn[0] || "") + (ln[0] || "");
      const labels = (info.row.original as any).labels || [];
      return (
        <div
          className="flex items-center gap-3 cursor-pointer group/name p-1 -ml-1 rounded-lg transition-all hover:bg-white/5"
          onClick={() => {
            window.dispatchEvent(
              new CustomEvent("open-contact-detail", {
                detail: info.row.original,
              }),
            );
          }}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 border border-violet-500/30 flex items-center justify-center text-[12px] font-black text-white shadow-lg shadow-violet-900/20 transition-transform duration-300 group-hover/name:scale-110 group-hover/name:shadow-violet-600/30">
            {initials.toUpperCase()}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-zinc-100 group-hover/name:text-violet-400 transition-colors leading-none text-sm tracking-tight">
              {fn} {ln}
            </span>
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
      <a
        href={`mailto:${info.getValue()}`}
        className="text-violet-400 hover:text-violet-300 hover:underline font-medium text-[13px] tracking-wide transition-colors"
      >
        {info.getValue()}
      </a>
    ),
  }),
  columnHelper.accessor("phone", {
    id: "phone",
    header: "Phone",
    cell: (info) => {
      const phone = info.getValue();
      return phone ? (
        <button
          onClick={() =>
            window.dispatchEvent(new CustomEvent("open-qr", { detail: phone }))
          }
          className="flex items-center gap-2 group hover:bg-white/5 px-2 py-1 -ml-2 rounded-lg transition-all border border-transparent hover:border-white/10"
        >
          <FlagBadge phone={phone} />
          <span className="text-[13px] font-medium text-zinc-300 group-hover:text-violet-400 tracking-wide transition-colors">
            {phone}
          </span>
        </button>
      ) : (
        <span className="text-white/20 text-xs font-bold">-</span>
      );
    },
  }),
  columnHelper.accessor("company", {
    id: "company",
    header: "Spoločnosť",
    cell: (info) =>
      info.getValue() ? (
        <span className="font-bold text-[13px] text-zinc-200 tracking-tight">{info.getValue()}</span>
      ) : (
        <span className="text-white/20 text-xs font-bold">-</span>
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
      <EditableComment
        id={Number(info.row.original.id)}
        initialValue={info.getValue() || ""}
      />
    ),
  }),
];
