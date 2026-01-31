"use client";

import * as React from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { Lead } from "@/types/contact";
import { FlagBadge } from "./FlagBadge";
import { EditableComment } from "./EditableComment";

const columnHelper = createColumnHelper<Lead>();

export const contactColumns = [
  columnHelper.accessor("first_name", {
    id: "contact",
    header: "Contact",
    cell: (info) => {
      const fn = info.row.original.first_name || "";
      const ln = info.row.original.last_name || "";
      const initials = (fn[0] || "") + (ln[0] || "");
      return (
        <div
          className="flex items-center gap-2 cursor-pointer group/name"
          onClick={() => {
            window.dispatchEvent(
              new CustomEvent("open-contact-detail", {
                detail: info.row.original,
              }),
            );
          }}
        >
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-100 dark:border-blue-800 flex items-center justify-center text-[10px] font-bold text-blue-700 dark:text-blue-300 shadow-sm transition-transform group-hover/name:scale-110">
            {initials.toUpperCase()}
          </div>
          <span className="font-bold text-foreground group-hover/name:text-blue-600 transition-colors leading-none text-xs">
            {fn} {ln}
          </span>
        </div>
      );
    },
  }),
  columnHelper.accessor("email", {
    header: "Email",
    cell: (info) => (
      <a
        href={`mailto:${info.getValue()}`}
        className="text-blue-600 hover:underline text-xs leading-none"
      >
        {info.getValue()}
      </a>
    ),
  }),
  columnHelper.accessor("phone", {
    header: "Phone",
    cell: (info) => {
      const phone = info.getValue();
      return phone ? (
        <button
          onClick={() =>
            window.dispatchEvent(new CustomEvent("open-qr", { detail: phone }))
          }
          className="flex items-center gap-2 group hover:bg-gray-50 px-2 py-1 rounded-md transition-all border border-transparent hover:border-gray-200"
        >
          <FlagBadge phone={phone} />
          <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600">
            {phone}
          </span>
        </button>
      ) : (
        <span className="text-gray-400 text-xs">-</span>
      );
    },
  }),
  columnHelper.accessor("company", {
    header: "Account",
    cell: (info) =>
      info.getValue() || <span className="text-gray-400 text-xs">-</span>,
  }),
  columnHelper.accessor("status", {
    id: "status",
    header: "Status",
    enableHiding: true,
  }),
  columnHelper.accessor("comments", {
    header: "Comments",
    cell: (info) => (
      <EditableComment
        id={info.row.original.id}
        initialValue={info.getValue() || ""}
      />
    ),
  }),
];
