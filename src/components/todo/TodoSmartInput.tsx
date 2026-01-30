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

  // Load relations when focused or picker opened
  useEffect(() => {
    if (isFocused && relations.contacts.length === 0) {
      loadRelations();
    }
  }, [isFocused]);

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

    const newVal = val.substring(0, start) + text + val.substring(end);
    setTitle(newVal);

    // Set cursor position after the inserted text
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + text.length, start + text.length);
    }, 10);

    setActivePicker(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onAdd(title);
      setTitle("");
      setActivePicker(null);
    }
  };

  const parseText = (text: string) => {
    // Basic regex to identify @Contact, #Project, $Deal, !Time
    // We'll look for specific patterns like @[Name](id)
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    // Regex for: @[Name](id), #[Name](id), $[Name](id), ![Time]
    const regex = /([@#$])\[(.*?)\]\((.*?)\)|(!\[(.*?)\])/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Push text before match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      if (match[1]) {
        // @, #, $
        const type = match[1];
        const name = match[2];
        const id = match[3];

        const colors = {
          "@": "bg-blue-500/10 text-blue-600 border-blue-200",
          "#": "bg-purple-500/10 text-purple-600 border-purple-200",
          $: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
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
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border font-black text-[11px] uppercase tracking-tight hover:scale-105 transition-transform ${colors[type as keyof typeof colors]}`}
            onClick={(e) => e.stopPropagation()}
          >
            {type === "@" && <User size={10} />}
            {type === "#" && <FolderKanban size={10} />}
            {type === "$" && <Briefcase size={10} />}
            {name}
          </Link>,
        );
      } else {
        // !Time
        const time = match[5];
        parts.push(
          <span
            key={match.index}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border bg-amber-500/10 text-amber-600 border-amber-200 font-black text-[11px] uppercase tracking-tight"
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
      className={`relative transition-all duration-300 ${isFocused ? "scale-[1.01]" : ""}`}
    >
      <div className="relative group">
        {/* Visual Layer (rendered behind transparent textarea) */}
        <div
          className="absolute inset-0 w-full h-24 bg-white dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 rounded-[2.5rem] px-8 py-6 text-lg font-bold pointer-events-none overflow-hidden whitespace-pre-wrap flex flex-wrap gap-y-1 align-baseline"
          style={{ visibility: isFocused ? "visible" : "hidden" }}
        >
          {parseText(title)}
          {title === "" && (
            <span className="text-zinc-300">
              Čo je dnes tvojou prioritou?...
            </span>
          )}
        </div>

        <textarea
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setIsFocused(true)}
          // onBlur handled by clicking outside
          placeholder={isFocused ? "" : "Čo je dnes tvojou prioritou?..."}
          className={`w-full h-24 bg-white dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 rounded-[2.5rem] px-8 py-6 text-lg font-bold focus:border-blue-500 outline-none transition-all resize-none ${isFocused ? "text-transparent caret-blue-600" : "text-zinc-900 dark:text-white"}`}
        />

        <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <TagButton
            icon={<User size={16} />}
            color={
              activePicker === "contact"
                ? "bg-blue-600 text-white"
                : "text-blue-500"
            }
            label="Kontakt"
            onClick={() =>
              setActivePicker(activePicker === "contact" ? null : "contact")
            }
          />
          <TagButton
            icon={<FolderKanban size={16} />}
            color={
              activePicker === "project"
                ? "bg-purple-600 text-white"
                : "text-purple-500"
            }
            label="Projekt"
            onClick={() =>
              setActivePicker(activePicker === "project" ? null : "project")
            }
          />
          <button
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-200 disabled:opacity-30 disabled:shadow-none transition-all hover:scale-110 active:scale-95"
          >
            <Plus size={28} />
          </button>
        </div>
      </div>

      {/* Pickers */}
      {isFocused && (activePicker || activePicker === null) && (
        <div className="absolute top-28 left-0 right-0 p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] z-[100] animate-in fade-in slide-in-from-top-4">
          {!activePicker ? (
            <>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-4 px-2">
                Smart Actions Control
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <SmartAction
                  icon={<User size={18} />}
                  title="Kontakt"
                  shortcut="@"
                  color="text-blue-500"
                  onClick={() => setActivePicker("contact")}
                />
                <SmartAction
                  icon={<FolderKanban size={18} />}
                  title="Projekt"
                  shortcut="#"
                  color="text-purple-500"
                  onClick={() => setActivePicker("project")}
                />
                <SmartAction
                  icon={<Briefcase size={18} />}
                  title="Obchod"
                  shortcut="$"
                  color="text-emerald-500"
                  onClick={() => setActivePicker("deal")}
                />
                <SmartAction
                  icon={<Clock size={18} />}
                  title="Čas"
                  shortcut="!"
                  color="text-amber-500"
                  onClick={() => setActivePicker("time")}
                />
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h4 className="text-sm font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                  {activePicker === "contact" && (
                    <>
                      <User size={14} className="text-blue-500" /> Výber
                      Kontaktu
                    </>
                  )}
                  {activePicker === "project" && (
                    <>
                      <FolderKanban size={14} className="text-purple-500" />{" "}
                      Výber Projektu
                    </>
                  )}
                  {activePicker === "deal" && (
                    <>
                      <Briefcase size={14} className="text-emerald-500" /> Výber
                      Obchodu
                    </>
                  )}
                  {activePicker === "time" && (
                    <>
                      <Clock size={14} className="text-amber-500" /> Nastaviť
                      Čas
                    </>
                  )}
                </h4>
                <button
                  onClick={() => setActivePicker(null)}
                  className="p-1 hover:bg-zinc-100 rounded-lg"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto pr-2 space-y-1 custom-scrollbar">
                {activePicker === "contact" &&
                  relations.contacts.map((c: any) => (
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
                {activePicker === "project" &&
                  relations.projects.map((p: any) => (
                    <PickerItem
                      key={p.id}
                      title={p.project_type}
                      sub={p.stage}
                      onClick={() =>
                        insertAtCursor(`#[${p.project_type}](${p.id})`)
                      }
                    />
                  ))}
                {activePicker === "deal" &&
                  relations.deals.map((d: any) => (
                    <PickerItem
                      key={d.id}
                      title={d.name}
                      sub={`${d.value} €`}
                      onClick={() => insertAtCursor(`$[${d.name}](${d.id})`)}
                    />
                  ))}
                {activePicker === "time" &&
                  [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((h) => (
                    <PickerItem
                      key={h}
                      title={`${h}:00`}
                      sub="Nastaviť hodinu"
                      onClick={() => insertAtCursor(`![${h}:00]`)}
                    />
                  ))}
                {loading && (
                  <div className="p-10 text-center text-xs font-bold text-zinc-400 animate-pulse">
                    Načítavam dáta z CRM...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Close handler backdrop */}
      {isFocused && (
        <div
          className="fixed inset-0 z-[90]"
          onClick={() => {
            setIsFocused(false);
            setActivePicker(null);
          }}
        />
      )}
    </div>
  );
}

function TagButton({
  icon,
  color,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  color: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      type="button"
      className={`p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800 ${color} hover:bg-white dark:hover:bg-zinc-700 border border-transparent hover:border-zinc-100 transition-all group relative`}
    >
      {icon}
      <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-zinc-800 text-white text-[9px] font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[110] shadow-xl">
        {label}
      </span>
    </button>
  );
}

function SmartAction({
  icon,
  title,
  shortcut,
  color,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  shortcut: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="flex items-center gap-3 p-4 rounded-3xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-white dark:hover:bg-zinc-800 cursor-pointer transition-all border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 hover:shadow-lg group"
    >
      <div className={`${color} group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <div className="flex-1 text-xs font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
        {title}
      </div>
      <div className="text-[10px] font-black text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md">
        {shortcut}
      </div>
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
      onClick={onClick}
      className="flex items-center justify-between p-4 rounded-2xl hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer border border-transparent hover:border-blue-100 dark:hover:border-blue-800 transition-all group"
    >
      <div className="flex flex-col">
        <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200 group-hover:text-blue-600 transition-colors">
          {title}
        </span>
        {sub && (
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            {sub}
          </span>
        )}
      </div>
      <Plus size={14} className="text-zinc-300 group-hover:text-blue-500" />
    </div>
  );
}
