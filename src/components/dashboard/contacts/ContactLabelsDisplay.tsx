"use client";

import * as React from "react";
import { Tag } from "lucide-react";

export function ContactLabelsDisplay({ labels }: { labels: any[] }) {
  if (!labels || labels.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {labels.map((junction: any) => {
        const label = junction.contact_labels_id;
        if (!label) return null;
        return (
          <span
            key={label.id}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter"
            style={{ 
              backgroundColor: `${label.color}15`, 
              color: label.color || '#3b82f6',
              border: `1px solid ${label.color}30`
            }}
          >
            <Tag className="w-2 h-2" />
            {label.name}
          </span>
        );
      })}
    </div>
  );
}
