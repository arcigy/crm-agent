"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Plus,
  User,
  FolderKanban,
  Briefcase,
  Calendar,
  Search,
  X,
  Link as LinkIcon,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { getTodoRelations } from "@/app/actions/todo-relations";
import { toast } from "sonner";
import Link from "next/link";

interface TodoSmartInputProps {
  onAdd: (title: string, dueDate?: string) => void;
}

type PickerType = "contact" | "project" | "deal" | "time" | null;

export function TodoSmartInput({ onAdd }: TodoSmartInputProps) {
  const [title, setTitle] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [activePicker, setActivePicker] = useState<PickerType>(null);
  const [relations, setRelations] = useState<any>({
    contacts: [],
    projects: [],
    deals: [],
  });
  const [loading, setLoading] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load relations
  useEffect(() => {
    if (isFocused && relations.contacts.length === 0) {
      loadRelations();
    }
  }, [isFocused]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsFocused(false);
        setActivePicker(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadRelations = async () => {
    setLoading(true);
    const res = await getTodoRelations();
    if (res.success) {
      setRelations(res.data);
    }
    setLoading(false);
  };

  const insertAtCursor = (text: string) => {
    const input = inputRef.current;
    if (!input) return;

    const start = input.selectionStart;
    const end = input.selectionEnd;
    const val = input.value;

    // Add space if needed
    const prefix = start > 0 && val[start - 1] !== " " ? " " : "";
    const suffix = end < val.length && val[end] !== " " ? " " : "";

    const insertion = prefix + text + suffix;
    const newVal = val.substring(0, start) + insertion + val.substring(end);

    setTitle(newVal);

    setTimeout(() => {
      input.focus();
      const newCursorPos = start + insertion.length;
      input.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);

    setActivePicker(null);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (title.trim()) {
      onAdd(title);
      setTitle("");
      setActivePicker(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const parseText = (text: string) => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    // Regex matches: @[Name](id), #[Name](id), $[Name](id), ![Time]
    const regex = /([@#$])\[(.*?)\]\((.*?)\)|(!\[(.*?)\])/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      if (match[1]) {
        const type = match[1];
        const name = match[2];
        const id = match[3];

        const colors = {
          "@": "bg-blue-600/20 text-blue-600 border-blue-400 hover:bg-blue-600 hover:text-white",
          "#": "bg-purple-600/20 text-purple-600 border-purple-400 hover:bg-purple-600 hover:text-white",
          $: "bg-emerald-600/20 text-emerald-600 border-emerald-400 hover:bg-emerald-600 hover:text-white",
        };

        const hrefs = {
          "@": `/dashboard/contacts?id=${id}`,
          "#": `/dashboard/projects?id=${id}`,
          $: `/dashboard/deals?id=${id}`,
        };

        parts.push(
          <Link
            key={match.index}
            href={hrefs[type as keyof typeof hrefs]}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border-2 font-black text-[12px] uppercase tracking-tighter cursor-pointer shadow-sm pointer-events-auto transition-all ${colors[type as keyof typeof colors]}`}
            onClick={(e) => e.stopPropagation()}
          >
            {type === "@" && <User size={10} />}
            {type === "#" && <FolderKanban size={10} />}
            {type === "$" && <Briefcase size={10} />}
            {name}
          </Link>,
        );
      } else {
        const time = match[5];
        parts.push(
          <span
            key={match.index}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border-2 bg-amber-600/20 text-amber-600 border-amber-400 font-black text-[12px] uppercase tracking-tighter pointer-events-auto"
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

  return (
    <div
      ref={containerRef}
      className={`relative transition-all duration-500 ease-out ${isFocused ? "scale-[1.01]" : ""}`}
    >
      <div className="relative group">
        {/* Visual Highlighter - Exactly matched padding and font */}
        <div
          className={`absolute inset-0 w-full min-h-[6rem] border-4 rounded-[2.5rem] px-8 py-8 text-xl font-bold z-20 pointer-events-none overflow-hidden whitespace-pre-wrap flex flex-wrap gap-y-2 content-start transition-all ${isFocused ? "border-blue-500 shadow-2xl shadow-blue-500/10 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-[2px]" : "border-zinc-100 dark:border-zinc-800"}`}
        >
          {parseText(title)}
        </div>

        <textarea
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={isFocused ? "" : "Napíš čo máš na mysli..."}
          className={`w-full min-h-[6rem] bg-white dark:bg-zinc-900 rounded-[2.5rem] px-8 py-8 text-xl font-bold outline-none transition-all resize-none relative z-10 ${isFocused ? "text-transparent caret-blue-600" : "text-zinc-900 dark:text-white"}`}
          style={{
            lineHeight: "1.5",
            WebkitTextFillColor: isFocused ? "transparent" : "inherit",
          }}
        />

        {/* Side Actions */}
        <div className="absolute right-6 top-8 flex flex-col gap-2 z-20">
          <TagButton
            icon={<User size={18} />}
            color={
              activePicker === "contact"
                ? "bg-blue-600 text-white"
                : "bg-blue-50 text-blue-500 border-blue-100 hover:bg-blue-100"
            }
            label="Kontakt"
            onClick={() =>
              setActivePicker(activePicker === "contact" ? null : "contact")
            }
          >
            {activePicker === "contact" && (
              <div className="absolute right-full mr-4 top-0 w-64 bg-white dark:bg-zinc-800 border-2 border-blue-100 dark:border-zinc-700 rounded-3xl shadow-2xl p-2 animate-in slide-in-from-right-2 fade-in duration-200">
                <PickerHeader
                  title="Kontakty"
                  icon={<User size={14} />}
                  onClose={() => setActivePicker(null)}
                />
                {relations.contacts.map((c: any) => (
                  <PickerItem
                    key={c.id}
                    title={`${c.first_name} ${c.last_name}`}
                    sub={c.company}
                    onClick={() =>
                      insertAtCursor(
                        `@[${c.first_name} ${c.last_name}](${c.id})`,
                      )
                    }
                  />
                ))}
              </div>
            )}
          </TagButton>

          <TagButton
            icon={<FolderKanban size={18} />}
            color={
              activePicker === "project"
                ? "bg-purple-600 text-white"
                : "bg-purple-50 text-purple-500 border-purple-100 hover:bg-purple-100"
            }
            label="Projekt"
            onClick={() =>
              setActivePicker(activePicker === "project" ? null : "project")
            }
          >
            {activePicker === "project" && (
              <div className="absolute right-full mr-4 top-0 w-64 bg-white dark:bg-zinc-800 border-2 border-purple-100 dark:border-zinc-700 rounded-3xl shadow-2xl p-2 animate-in slide-in-from-right-2 fade-in duration-200">
                <PickerHeader
                  title="Projekty"
                  icon={<FolderKanban size={14} />}
                  onClose={() => setActivePicker(null)}
                />
                {relations.projects.map((p: any) => (
                  <PickerItem
                    key={p.id}
                    title={p.project_type}
                    sub={p.stage}
                    onClick={() =>
                      insertAtCursor(`#[${p.project_type}](${p.id})`)
                    }
                  />
                ))}
              </div>
            )}
          </TagButton>

          <TagButton
            icon={<Clock size={18} />}
            color={
              activePicker === "time"
                ? "bg-amber-600 text-white"
                : "bg-amber-50 text-amber-500 border-amber-100 hover:bg-amber-100"
            }
            label="Čas"
            onClick={() =>
              setActivePicker(activePicker === "time" ? null : "time")
            }
          >
            {activePicker === "time" && (
              <div className="absolute right-full mr-4 top-0 w-32 bg-white dark:bg-zinc-800 border-2 border-amber-100 dark:border-zinc-700 rounded-3xl shadow-2xl p-2 animate-in slide-in-from-right-2 fade-in duration-200">
                <PickerHeader
                  title="Čas"
                  icon={<Clock size={14} />}
                  onClose={() => setActivePicker(null)}
                />
                <div className="grid grid-cols-1 gap-1">
                  {[9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((h) => (
                    <PickerItem
                      key={h}
                      title={`${h}:00`}
                      onClick={() => insertAtCursor(`![${h}:00]`)}
                    />
                  ))}
                </div>
              </div>
            )}
          </TagButton>
        </div>

        {/* Floating Submit Button */}
        <button
          onClick={() => handleSubmit()}
          disabled={!title.trim()}
          className="absolute bottom-6 right-6 w-14 h-14 bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl flex items-center justify-center shadow-xl transition-all hover:scale-110 active:scale-90 disabled:opacity-20 z-20"
        >
          <Plus size={32} />
        </button>
      </div>

      {isFocused && !activePicker && (
        <div className="flex gap-4 mt-4 px-6 animate-in slide-in-from-top-2 fade-in duration-300">
          <HintBadge icon={<User size={10} />} label="@ Prepojiť Kontakt" />
          <HintBadge
            icon={<FolderKanban size={10} />}
            label="# Priradiť Projekt"
          />
          <HintBadge icon={<Clock size={10} />} label="! Nastaviť Čas" />
        </div>
      )}
    </div>
  );
}

function TagButton({
  icon,
  color,
  label,
  onClick,
  children,
}: {
  icon: React.ReactNode;
  color: string;
  label: string;
  onClick: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        type="button"
        className={`p-3.5 rounded-2xl border-2 transition-all group ${color}`}
      >
        {icon}
        <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-zinc-800 text-white text-[10px] font-black px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[110] uppercase tracking-widest">
          {label}
        </span>
      </button>
      {children}
    </div>
  );
}

function PickerHeader({
  title,
  icon,
  onClose,
}: {
  title: string;
  icon: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2 mb-2 border-b border-zinc-50 dark:border-zinc-700/50">
      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
        {icon} {title}
      </span>
      <button onClick={onClose} className="text-zinc-300 hover:text-zinc-900">
        <X size={12} />
      </button>
    </div>
  );
}

function PickerItem({
  title,
  sub,
  onClick,
}: {
  title: string;
  sub?: string;
  onClick: () => void;
}) {
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="flex flex-col p-3 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-700/50 cursor-pointer transition-all border border-transparent hover:border-zinc-100 dark:hover:border-zinc-600"
    >
      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
        {title}
      </span>
      {sub && (
        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-tight">
          {sub}
        </span>
      )}
    </div>
  );
}

function HintBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-zinc-400 opacity-60">
      {icon} {label}
    </span>
  );
}
