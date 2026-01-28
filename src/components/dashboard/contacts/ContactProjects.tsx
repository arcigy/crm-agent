"use client";

import * as React from "react";
import { FolderKanban, Clock } from "lucide-react";
import { Lead } from "@/types/contact";

export function ContactProjects({ contact }: { contact: Lead }) {
  return (
    <section className="bg-card rounded-2xl p-6 border border-border shadow-sm transition-colors duration-300">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <FolderKanban className="w-4 h-4 text-gray-400" /> Active Projects
        </h3>
        <button className="text-[11px] font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 py-1 rounded uppercase tracking-wide transition-colors">
          + New Project
        </button>
      </div>

      {contact.projects && contact.projects.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {contact.projects.map((p, i) => (
            <div
              key={i}
              className="p-4 rounded-xl border border-border bg-background hover:bg-card hover:shadow-md hover:border-blue-100 dark:hover:border-blue-900 transition-all cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="px-2 py-0.5 bg-gray-50 dark:bg-slate-800 border border-border rounded text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  {p.project_type}
                </span>
                <span
                  className={`w-2 h-2 rounded-full ${p.stage === "completed" ? "bg-green-500" : "bg-blue-500"}`}
                ></span>
              </div>
              <h4 className="font-bold text-foreground text-sm mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Project #{p.id}
              </h4>
              <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                <Clock className="w-3 h-3" />{" "}
                {new Date(p.date_created).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center border-2 border-dashed border-border rounded-xl">
          <p className="text-xs text-gray-400 font-medium">
            No active projects linked to this contact.
          </p>
        </div>
      )}
    </section>
  );
}
