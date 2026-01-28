"use client";

import * as React from "react";
import { ChevronDown, Loader2, Check } from "lucide-react";
import { PROJECT_STAGES, ProjectStage } from "@/types/project";

interface StageBadgeProps {
  stage: ProjectStage;
  projectId: number;
  onStageChange: (id: number, stage: ProjectStage) => Promise<void>;
}

export function StageBadge({
  stage,
  projectId,
  onStageChange,
}: StageBadgeProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const stageInfo =
    PROJECT_STAGES.find((s) => s.value === stage) || PROJECT_STAGES[0];

  const handleChange = async (newStage: ProjectStage) => {
    setLoading(true);
    await onStageChange(projectId, newStage);
    setLoading(false);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border transition-all ${stageInfo.color}`}
      >
        {loading ? (
          <Loader2 className="w-2.5 h-2.5 animate-spin" />
        ) : (
          stageInfo.label
        )}
        <ChevronDown className="w-2.5 h-2.5 opacity-60" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-20 min-w-[160px]">
            {PROJECT_STAGES.map((s) => (
              <button
                key={s.value}
                onClick={() => handleChange(s.value)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${stage === s.value ? "font-bold" : ""}`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${s.color.split(" ")[0]}`}
                />
                {s.label}
                {stage === s.value && (
                  <Check className="w-3 h-3 ml-auto text-blue-500" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
