"use client";

import * as React from "react";
import { Briefcase, Plus, StickyNote } from "lucide-react";
import { Lead } from "@/types/contact";

export function ContactDealsNotes({ contact }: { contact: Lead }) {
  return (
    <div className="space-y-6">
      <section className="bg-card rounded-2xl p-5 border border-border shadow-sm transition-colors duration-300">
        <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center justify-between">
          Active Deals{" "}
          <span className="text-foreground">{contact.deals?.length || 0}</span>
        </h3>
        <div className="space-y-3">
          {contact.deals?.map((d, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 rounded-xl bg-background border border-border transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center">
                  <Briefcase className="w-3.5 h-3.5 text-gray-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">{d.name}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase transition-colors">
                    {d.paid ? "Paid" : "Pending"}
                  </p>
                </div>
              </div>
              <span className="text-xs font-black text-foreground">
                ${d.value}
              </span>
            </div>
          ))}
          <button className="w-full py-2 border border-dashed border-border rounded-xl text-xs font-bold text-gray-400 hover:text-blue-600 hover:border-blue-200 transition-all flex items-center justify-center gap-1">
            <Plus className="w-3 h-3" /> Add Deal
          </button>
        </div>
      </section>

      <section className="bg-amber-50/50 dark:bg-amber-900/10 rounded-2xl p-5 border border-amber-100/50 dark:border-amber-900/50 transition-colors">
        <h3 className="text-xs font-black uppercase tracking-widest text-amber-500 mb-3 flex items-center gap-2">
          <StickyNote className="w-3 h-3" /> Internal Notes
        </h3>
        <textarea
          className="w-full bg-background dark:bg-slate-900 border-0 rounded-xl shadow-sm text-xs text-foreground p-3 min-h-[120px] resize-none focus:ring-1 focus:ring-amber-200 outline-none transition-colors"
          placeholder="Add private notes about this client..."
          defaultValue={contact.comments || ""}
          onKeyDown={async (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              const val = e.currentTarget.value;
              const { updateContactComments } = await import("@/app/actions/contacts");
              await updateContactComments(contact.id, val);
            }
          }}
        />
        <button className="mt-2 text-[10px] font-bold text-amber-600 hover:text-amber-800 uppercase tracking-wide float-right transition-colors">
          Save Note
        </button>
      </section>
    </div>
  );
}
