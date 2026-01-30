"use client";

import React from "react";
import Link from "next/link";
import { User, FolderKanban, Briefcase, Clock } from "lucide-react";

interface SmartTextProps {
  text: string;
  className?: string;
}

export function SmartText({ text, className = "" }: SmartTextProps) {
  const parseText = (text: string) => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    // Regex for: @[Name](id), #[Name](id), $[Name](id), ![Time]
    const regex = /([@#$])\[(.*?)\]\((.*?)\)|(!\[(.*?)\])/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      if (match[1]) {
        // @, #, $
        const type = match[1];
        const name = match[2];
        const id = match[3];

        const colors = {
          "@": "bg-blue-500/10 text-blue-600 border-blue-200 hover:bg-blue-500 hover:text-white",
          "#": "bg-purple-500/10 text-purple-600 border-purple-200 hover:bg-purple-500 hover:text-white",
          $: "bg-emerald-500/10 text-emerald-600 border-emerald-200 hover:bg-emerald-500 hover:text-white",
        };

        const hrefs = {
          "@": `/dashboard/contacts?id=${id}`,
          "#": `/dashboard/projects?id=${id}`,
          $: `/dashboard/deals?id=${id}`,
        };

        const Icon =
          type === "@" ? User : type === "#" ? FolderKanban : Briefcase;

        parts.push(
          <Link
            key={match.index}
            href={hrefs[type as keyof typeof hrefs]}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border font-black text-[10px] uppercase tracking-tight transition-all mx-1 ${colors[type as keyof typeof colors]}`}
            onClick={(e) => e.stopPropagation()}
          >
            <Icon size={10} />
            {name}
          </Link>,
        );
      } else {
        // !Time
        const time = match[5];
        parts.push(
          <span
            key={match.index}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border bg-amber-500/10 text-amber-600 border-amber-200 font-black text-[10px] uppercase tracking-tight mx-1"
          >
            <Clock size={10} />
            {time}
          </span>,
        );
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  return <div className={className}>{parseText(text)}</div>;
}
