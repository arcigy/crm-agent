"use client";

import React from "react";
import { useContactPreview } from "@/components/providers/ContactPreviewProvider";

interface SmartTextProps {
  text: string;
  className?: string;
}

export function SmartText({ text, className = "" }: SmartTextProps) {
  // Use context for opening contact details
  // We explicitly try to get context, but if it fails (not in provider), we degrade gracefully
  let openContact: ((id: string | number) => void) | undefined;
  try {
    const ctx = useContactPreview();
    openContact = ctx.openContact;
  } catch (e) {
    // Ignore if provider missing
  }

  // 1. Convert legacy syntax @[...] to HTML
  const processText = (input: string) => {
    // Regex for: @[Name](id), #[Name](id), $[Name](id), ![Time]
    const regex = /([@#$])\[(.*?)\]\((.*?)\)|(!\[(.*?)\])/g;

    return input.replace(regex, (match, type, name, id, timeMatch, time) => {
      if (type) {
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
        const colorClass = colors[type as keyof typeof colors] || "";
        const href = hrefs[type as keyof typeof hrefs] || "#";

        // Add data-contact-id only for contacts
        const dataAttr = type === "@" ? `data-contact-id="${id}"` : "";

        // Return HTML string for the tag
        return `<a href="${href}" ${dataAttr} class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border font-black text-[10px] uppercase tracking-tight transition-all mx-1 ${colorClass} no-underline">
                ${type === "@" ? "👤" : type === "#" ? "📁" : "💼"} ${name}
            </a>`;
      } else {
        // Time legacy
        return `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border bg-amber-500/10 text-amber-600 border-amber-200 font-black text-[10px] uppercase tracking-tight mx-1">
                🕒 ${time}
             </span>`;
      }
    });
  };

  const processedHtml = processText(text);

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Check if clicked element is inside an anchor tag
    const link = target.closest("a");

    if (link) {
      e.stopPropagation(); // Always stop propagation for links inside SmartText

      const contactId = link.getAttribute("data-contact-id");
      // If it's a contact link and we have the opener
      if (contactId && openContact) {
        e.preventDefault();
        openContact(contactId);
      }
    }
  };

  return (
    <div
      className={`prose prose-sm max-w-none dark:prose-invert [&_p]:m-0 [&_ul]:m-0 [&_li]:m-0 ${className}`}
      dangerouslySetInnerHTML={{ __html: processedHtml }}
      onClick={handleClick}
    />
  );
}
