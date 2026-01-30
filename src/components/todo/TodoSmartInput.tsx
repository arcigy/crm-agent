"use client";

import React, { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import LinkExtension from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import {
  Plus,
  User,
  FolderKanban,
  X,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
} from "lucide-react";
import { getTodoRelations } from "@/app/actions/todo-relations";

interface TodoSmartInputProps {
  onAdd: (title: string, time?: string) => void;
}

type PickerType = "contact" | "project" | "deal" | null;

export function TodoSmartInput({ onAdd }: TodoSmartInputProps) {
  const [time, setTime] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [activePicker, setActivePicker] = useState<PickerType>(null);
  const [relations, setRelations] = useState<any>({
    contacts: [],
    projects: [],
    deals: [],
  });
  const [loading, setLoading] = useState(false);

  // Initialize Tiptap Editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight,
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "cursor-pointer text-blue-600 underline decoration-blue-300",
        },
      }),
      Placeholder.configure({
        placeholder: "Napíš čo máš na mysli...",
      }),
    ],
    editorProps: {
      attributes: {
        class:
          "outline-none min-h-[8rem] px-8 py-8 pt-12 pb-20 text-xl font-bold text-zinc-900 dark:text-white prose prose-lg max-w-none dark:prose-invert [&_p]:m-0 [&_ul]:m-0 [&_li]:m-0",
      },
    },
    onFocus: () => setIsFocused(true),
    // Save draft on update
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // Simple debounce or just save
      saveDraft(html, time);
    },
  });

  // Load draft from localStorage on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem("todo-draft");
    if (savedDraft && editor) {
      try {
        const parsed = JSON.parse(savedDraft);
        if (parsed.title && editor.isEmpty) {
          editor.commands.setContent(parsed.title);
        }
        setTime(parsed.time || "");
      } catch (e) {
        console.error("Failed to parse draft", e);
      }
    }
  }, [editor]);

  // Save time change to draft
  useEffect(() => {
    if (editor) {
      saveDraft(editor.getHTML(), time);
    }
  }, [time, editor]);

  const saveDraft = (titleHtml: string, timeVal: string) => {
    localStorage.setItem(
      "todo-draft",
      JSON.stringify({ title: titleHtml, time: timeVal }),
    );
  };

  // Load relations
  useEffect(() => {
    if (isFocused && relations.contacts.length === 0) {
      loadRelations();
    }
  }, [isFocused]);

  // Click outside handler logic is tricky with Tiptap as click inside toolbar/picker is "outside" editor but inside component.
  // We attach ref to container.
  const containerRef = React.useRef<HTMLDivElement>(null);
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

  const insertMention = (
    text: string,
    id: string | number,
    type: "contact" | "project",
  ) => {
    if (!editor) return;

    // We insert a Link that looks like a tag
    const href =
      type === "contact"
        ? `/dashboard/contacts?id=${id}`
        : `/dashboard/projects?id=${id}`;

    // Custom data attributes are stripped by default Link extension unless properly configured or extended.
    // For simplicity and robustness, we rely on the Href or ID.
    // However, SmartText (the display component) uses data-contact-id.
    // Let's try to insert HTML directly.
    const icon = type === "contact" ? "👤" : "📁";
    const label = `${icon} ${text}`;

    // Simple approach: Insert text and link it.
    // We want it to be noticeable.
    // We can use setLink.

    // Insert text first
    editor
      .chain()
      .focus()
      .insertContent(
        `<a href="${href}" data-contact-id="${id}" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-blue-200 bg-blue-50 text-blue-600 font-bold text-sm no-underline mx-1" contenteditable="false">${label}</a> `,
      )
      .run();

    setActivePicker(null);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (editor && !editor.isEmpty) {
      const html = editor.getHTML();
      onAdd(html, time); // Pass HTML
      editor.commands.clearContent();
      setTime("");
      localStorage.removeItem("todo-draft");
      setActivePicker(null);
    }
  };

  // Handle Ctrl+Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && isFocused) {
        // Tiptap handles Enter as new paragraph. We want submit?
        // User requested "Enter" to submit? The old textarea did.
        // But rich text editors usually use Enter for new lines.
        // Let's keep Enter = New Line, Ctrl+Enter = Submit, OR simple Enter = Submit if not Shift?
        // "Word-like" usually means Enter = New line.
        // But this is a "Todo Input". Usually Enter submits.
        // Let's stick to: Enter = Submit, Shift+Enter = New Line.
        // But Tiptap captures Enter. We need custom handler in editor props or extension.
        // Simpler: Just check keydown on container? Tiptap consumes it.
        // We can add a custom keyboard shortcut to Tiptap config if needed.
        // But let's assume the user presses the BIG PLUS BUTTON for now or Ctrl+Enter.
        // WAIT, code snippet below handles Enter on div? No.
        // Let's leave Enter as new line for formatted text (paragraphs). It's more "Word-like".
      }
    };
    // Implementing Enter to submit via Tiptap extension is best, but let's stick to Button submit for robustness unless requested.
    // Actually, users expect Enter to submit in single-line inputs, but this is a multi-line rich editor.
  }, [isFocused]);

  if (!editor) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`relative transition-all duration-500 ease-out bg-transparent ${
        isFocused ? "scale-[1.01]" : ""
      }`}
    >
      <div className="relative group bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-sm border border-zinc-200 dark:border-zinc-800 transition-all duration-300 focus-within:border-blue-500 focus-within:shadow-blue-500/10 focus-within:ring-4 focus-within:ring-blue-500/5">
        {/* Formatting Toolbar */}
        {isFocused && (
          <div className="absolute top-4 left-8 right-8 flex items-center gap-2 z-40 animate-in fade-in slide-in-from-bottom-1 duration-200">
            <ToolbarBtn
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive("bold")}
              icon={<Bold size={14} strokeWidth={3} />}
            />
            <ToolbarBtn
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive("italic")}
              icon={<Italic size={14} strokeWidth={3} />}
            />
            <ToolbarBtn
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              isActive={editor.isActive("underline")}
              icon={<UnderlineIcon size={14} strokeWidth={3} />}
            />
            <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-700 mx-1" />
            <ToolbarBtn
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive("bulletList")}
              icon={<List size={14} strokeWidth={3} />}
            />
          </div>
        )}

        {/* Tiptap Editor Content */}
        <EditorContent editor={editor} className="min-h-[8rem]" />

        {/* Bottom Actions Toolbar */}
        <div className="absolute left-8 bottom-6 flex items-center gap-3 z-30 transition-all duration-300">
          {/* Time Picker */}
          <div className="relative group/time">
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="pl-3 pr-1 py-3.5 bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded-2xl text-sm font-bold text-zinc-600 dark:text-zinc-300 focus:outline-none focus:border-blue-500 transition-all cursor-pointer w-[110px]"
            />
          </div>

          <div className="w-[1px] h-8 bg-zinc-200 dark:bg-zinc-700 mx-1" />

          {/* Relation Buttons */}
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
              <div className="absolute bottom-full left-0 mb-4 w-64 bg-white dark:bg-zinc-800 border-2 border-blue-100 dark:border-zinc-700 rounded-3xl shadow-2xl p-2 animate-in slide-in-from-bottom-2 fade-in duration-200 z-50">
                <PickerHeader
                  title="Kontakty"
                  icon={<User size={14} />}
                  onClose={() => setActivePicker(null)}
                />
                <div className="max-h-60 overflow-y-auto">
                  {relations.contacts.map((c: any) => (
                    <PickerItem
                      key={c.id}
                      title={`${c.first_name} ${c.last_name}`}
                      sub={c.company}
                      onClick={() =>
                        insertMention(
                          `${c.first_name} ${c.last_name}`,
                          c.id,
                          "contact",
                        )
                      }
                    />
                  ))}
                </div>
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
              <div className="absolute bottom-full left-0 mb-4 w-64 bg-white dark:bg-zinc-800 border-2 border-purple-100 dark:border-zinc-700 rounded-3xl shadow-2xl p-2 animate-in slide-in-from-bottom-2 fade-in duration-200 z-50">
                <PickerHeader
                  title="Projekty"
                  icon={<FolderKanban size={14} />}
                  onClose={() => setActivePicker(null)}
                />
                <div className="max-h-60 overflow-y-auto">
                  {relations.projects.map((p: any) => (
                    <PickerItem
                      key={p.id}
                      title={p.project_type}
                      sub={p.stage}
                      onClick={() =>
                        insertMention(p.project_type, p.id, "project")
                      }
                    />
                  ))}
                </div>
              </div>
            )}
          </TagButton>
        </div>

        {/* Floating Submit Button */}
        <button
          onClick={(e) => handleSubmit(e)}
          disabled={editor.isEmpty}
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
        </div>
      )}
    </div>
  );
}

function ToolbarBtn({
  onClick,
  isActive,
  icon,
}: {
  onClick: () => void;
  isActive: boolean;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-1.5 rounded-md transition-colors ${
        isActive
          ? "bg-zinc-200 dark:bg-zinc-600 text-zinc-900 dark:text-white"
          : "hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-500"
      }`}
    >
      {icon}
    </button>
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
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-zinc-800 text-white text-[10px] font-black px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[110] uppercase tracking-widest">
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
