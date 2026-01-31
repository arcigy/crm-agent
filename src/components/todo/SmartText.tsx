"use client";

import React from "react";
import { useContactPreview } from "@/components/providers/ContactPreviewProvider";
import { useProjectPreview } from "@/components/providers/ProjectPreviewProvider";

interface SmartTextProps {
  text: string;
  className?: string;
}

export function SmartText({ text, className = "" }: SmartTextProps) {
  // Use context for opening details
  let openContact: ((id: string | number) => void) | undefined;
  let openProject: ((id: string | number) => void) | undefined;

  try {
    const contactCtx = useContactPreview();
    openContact = contactCtx.openContact;
  } catch (e) {}

  try {
    const projectCtx = useProjectPreview();
    openProject = projectCtx.openProject;
  } catch (e) {}

  // 1. Convert legacy syntax @[...] to HTML
  const processText = (input: string) => {
    const legacyRegex = /([@#$])\[(.*?)\]\((.*?)\)|(!\[(.*?)\])/g;
    const html = input.replace(
      legacyRegex,
      (match, type, name, id, timeMatch, time) => {
        if (type) {
          const mentionType =
            type === "@" ? "contact" : type === "#" ? "project" : "deal";
          const typeClass =
            mentionType === "project"
              ? "mention-tag-project"
              : "mention-tag-contact";

          return `<span data-mention-component data-contact-id="${id}" data-type="${mentionType}" class="mention-tag ${typeClass}">
                ${type === "@" ? "👤" : type === "#" ? "📁" : "💼"} ${name}
            </span>`;
        } else {
          return `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border bg-amber-500/10 text-amber-600 border-amber-200 font-black text-[10px] uppercase tracking-tight mx-1 select-none">
                🕒 ${time}
             </span>`;
        }
      },
    );

    return html;
  };

  const processedHtml = processText(text);

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const mention = target.closest("[data-mention-component]");

    if (mention) {
      const id = mention.getAttribute("data-contact-id");
      const type = mention.getAttribute("data-type") || "contact";

      if (id) {
        e.preventDefault();
        e.stopPropagation();

        if (type === "project" && openProject) {
          openProject(id);
        } else if (openContact) {
          openContact(id);
        }
        return;
      }
    }
  };

  return (
    <div
      className={`prose prose-sm max-w-none dark:prose-invert [&_p]:m-0 [&_ul]:m-0 [&_li]:m-0 select-none ${className}`}
      dangerouslySetInnerHTML={{ __html: processedHtml }}
      onClick={handleClick}
    />
  );
}
