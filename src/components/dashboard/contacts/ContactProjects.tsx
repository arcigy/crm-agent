"use client";

import * as React from "react";
import { FolderKanban, Clock } from "lucide-react";
import { Lead } from "@/types/contact";

export function ContactProjects({ contact }: { contact: Lead }) {
  return (
    <section className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <FolderKanban className="w-4 h-4 text-gray-400" /> Active Projects
        </h3>
        <button className="text-[11px] font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded uppercase tracking-wide">
          + New Project
        </button>
      </div>

      {contact.projects && contact.projects.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {contact.projects.map((p, i) => (
            <div
              key={i}
              className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-md hover:border-blue-100 transition-all cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="px-2 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  {p.project_type}
                </span>
                <span
                  className={`w-2 h-2 rounded-full ${p.stage === "completed" ? "bg-green-500" : "bg-blue-500"}`}
                ></span>
              </div>
              <h4 className="font-bold text-gray-800 text-sm mb-1 group-hover:text-blue-600">
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
        <div className="p-8 text-center border-2 border-dashed border-gray-100 rounded-xl">
          <p className="text-xs text-gray-400 font-medium">
            No active projects linked to this contact.
          </p>
        </div>
      )}
    </section>
  );
}
