"use client";

import * as React from "react";
import { CheckCircle2, Phone, MessageSquare, Mail } from "lucide-react";
import { Lead } from "@/types/contact";

export function ContactActivity({ contact }: { contact: Lead }) {
  return (
    <section className="bg-card rounded-2xl p-6 border border-border shadow-sm min-h-[300px] transition-colors duration-300">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-gray-400" /> Activity Log
        </h3>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-400 rounded-lg text-xs font-bold transition-colors">
            Log Call
          </button>
          <button className="px-3 py-1.5 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-400 rounded-lg text-xs font-bold transition-colors">
            Log Email
          </button>
        </div>
      </div>

      <div className="space-y-6 relative pl-2">
        <div className="absolute left-[27px] top-2 bottom-4 w-px bg-border"></div>

        {contact.activities?.map((a, i) => (
          <div key={i} className="flex gap-4 relative group">
            <div
              className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center z-10 border-4 border-card shadow-sm transition-colors
                            ${
                              a.type === "call"
                                ? "bg-blue-600 text-white"
                                : a.type === "sms"
                                  ? "bg-emerald-500 text-white"
                                  : "bg-pink-500 text-white"
                            }
                        `}
            >
              {a.type === "call" ? (
                <Phone className="w-4 h-4" />
              ) : a.type === "sms" ? (
                <MessageSquare className="w-4 h-4" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
            </div>
            <div className="flex-1 pt-1.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-foreground">
                  {a.subject || "Interaction"}
                </span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide bg-gray-50 dark:bg-slate-800 px-2 py-0.5 rounded transition-colors">
                  {new Date(a.date).toLocaleDateString()}
                </span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed bg-gray-50/50 dark:bg-slate-900/50 p-3 rounded-lg border border-transparent group-hover:border-border transition-all">
                {a.content ||
                  "No specific notes recorded for this interaction."}
              </p>
            </div>
          </div>
        ))}

        {(!contact.activities || contact.activities.length === 0) && (
          <p className="text-xs text-gray-400 italic text-center py-4">
            No activity history found.
          </p>
        )}
      </div>
    </section>
  );
}
