"use client";

import React, { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import LinkExtension from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import {
  Plus,
  User,
  FolderKanban,
  X,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  Palette,
} from "lucide-react";
import {
  getTodoRelations,
  ContactRelation,
  ProjectRelation,
  DealRelation,
} from "@/app/actions/todo-relations";
import { useContactPreview } from "@/components/providers/ContactPreviewProvider";
import { useProjectPreview } from "@/components/providers/ProjectPreviewProvider";

import { MentionNode } from "@/lib/tiptap-mention-node";
import { useAutocomplete } from "@/hooks/useAutocomplete";
import { AutocompleteDropdown } from "@/components/editor/AutocompleteDropdown";

interface TodoSmartInputProps {
  onAdd: (title: string, time?: string) => void;
}

interface Relations {
  contacts: ContactRelation[];
  projects: ProjectRelation[];
  deals: DealRelation[];
}

const COLORS = [
  { value: "inherit", label: "Default" },
  { value: "#2563eb", label: "Blue" },
  { value: "#dc2626", label: "Red" },
  { value: "#059669", label: "Green" },
  { value: "#d97706", label: "Orange" },
  { value: "#9333ea", label: "Purple" },
];

const CustomLink = LinkExtension.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      "data-contact-id": {
        default: null,
        parseHTML: (element) => element.getAttribute("data-contact-id"),
        renderHTML: (attributes) => ({
          "data-contact-id": attributes["data-contact-id"],
        }),
      },
    };
  },
});

export function TodoSmartInput({ onAdd }: TodoSmartInputProps) {
  const [time, setTime] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [activePicker, setActivePicker] = useState<
    "contact" | "project" | "deal" | null
  >(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [relations, setRelations] = useState<Relations>({
    contacts: [],
    projects: [],
    deals: [],
  });

  // Preview contexts
  let openContact: ((id: string | number) => void) | undefined;
  let openProject: ((id: string | number) => void) | undefined;

  try {
    const contactCtx = useContactPreview();
    openContact = contactCtx.openContact;
  } catch {
    // ignore
  }

  try {
    const projectCtx = useProjectPreview();
    openProject = projectCtx.openProject;
  } catch {
    // ignore
  }

  const {
    suggestions,
    position,
    selectedIndex,
    checkAutocomplete,
    selectSuggestion,
    handleKeyDown,
  } = useAutocomplete();

  // Initialize Tiptap Editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bold: { HTMLAttributes: { class: "font-bold" } },
        italic: { HTMLAttributes: { class: "italic" } },
      }),
      Underline,
      Highlight,

      TextStyle,
      Color,
      MentionNode,
      CustomLink.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "cursor-pointer",
        },
      }),
        Placeholder.configure({
        placeholder: "Čo plánuješ urobiť? (Použi @ pre kontakt, # pre projekt)",
        includeChildren: true,
      }),
    ],
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "outline-none min-h-[7rem] px-8 pt-18 pb-22 text-lg font-medium text-zinc-900 dark:text-white prose prose-lg max-w-none dark:prose-invert [&_p]:m-0 [&_ul]:m-0 [&_li]:m-0 [&_strong]:font-bold",
      },
      handleKeyDown: (view, event) => {
        // First try autocomplete keyboard navigation
        const handledByAutocomplete = handleKeyDown(event, editor);

        if (handledByAutocomplete) return true;

        // If Enter is pressed (without Shift) and autocomplete didn't take it, submit
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          // We must use a small timeout or wait for the next tick to ensure
          // any pending onUpdate changes are processed if needed,
          // though handleSubmit gets content directly from editor.
          handleSubmit();
          return true;
        }

        return false;
      },

      handleClick: (view, pos, event) => {
        const target = event.target as HTMLElement;
        const mention = target.closest("[data-contact-id]");
        if (mention) {
          const id = mention.getAttribute("data-contact-id");
          const type = mention.getAttribute("data-type") || "contact";

          if (id) {
            event.preventDefault();
            event.stopPropagation();
            if (type === "project" && openProject) {
              openProject(id);
            } else if (openContact) {
              openContact(id);
            }
            return true;
          }
        }
        return false;
      },
    },

    onFocus: () => setIsFocused(true),
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      saveDraft(html, time);

      // Check for autocomplete trigger
      checkAutocomplete(editor);
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
    if ((isFocused || activePicker) && relations.contacts.length === 0) {
      loadRelations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused, activePicker]);

  const containerRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as globalThis.Node)
      ) {
        setIsFocused(false);
        setActivePicker(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadRelations = async () => {
    try {
      console.log("Loading relations for TodoSmartInput...");
      const res = await getTodoRelations();
      console.log("Relations loaded:", res);
      if (res.success && res.data) {
        setRelations(res.data);
        import("sonner").then(({ toast }) => toast.success("Dáta načítané"));
      } else {
        const err = (res as { error?: string }).error || "Neznáma chyba";
        import("sonner").then(({ toast }) =>
          toast.error(`Chyba načítania: ${err}`),
        );
      }
    } catch (err: unknown) {
      console.error("Error loading relations:", err);
      import("sonner").then(({ toast }) =>
        toast.error("Chyba spojenia s databázou"),
      );
    }
  };

  const insertMention = (
    text: string,
    id: string | number,
    type: "contact" | "project",
  ) => {
    if (!editor) return;

    console.log("Locally inserting mention:", { text, id, type });

    editor
      .chain()
      .focus()
      .insertContent({
        type: "mentionComponent",
        attrs: {
          id: id,
          label: text,
          type: type,
        },
      })
      .insertContent(" ")
      .run();

    setActivePicker(null);
  };

  const applyColor = (color: string) => {
    if (!editor) return;

    if (color === "inherit") {
      editor.chain().focus().unsetColor().run();
    } else {
      editor.chain().focus().setColor(color).run();
    }
    setShowColorPicker(false);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editor) return;

    const html = editor.getHTML();
    const text = editor.getText().trim();
    const hasMentions = html.includes("data-mention-component");

    console.log("Submitting task:", { html, text, hasMentions, time });

    if (text || hasMentions) {
      // Import toast dynamically or use prop if available.
      // Assuming toast from sonner is available globally or via import.
      import("sonner").then(({ toast }) => toast.info("Ukladám úlohu..."));

      onAdd(html, time);
      editor.commands.clearContent();
      setTime("");
      localStorage.removeItem("todo-draft");
      setIsFocused(false);
      setActivePicker(null);
    } else {
      console.warn("Task is empty, not submitting.");
      import("sonner").then(({ toast }) =>
        toast.error("Nemožno uložiť prázdnu úlohu"),
      );
    }
  };

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
        {/* Formatting & Relation Toolbar */}
        <div className="absolute top-4 left-8 right-8 flex items-center justify-between z-50">
          <div className="flex items-center gap-2">
            <ToolbarBtn
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive("bold")}
              icon={<Bold size={14} strokeWidth={3} />}
              title="Tučné písmo"
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
            <div className="relative">
              <ToolbarBtn
                onClick={() => setShowColorPicker(!showColorPicker)}
                isActive={!!editor.getAttributes("textStyle").color}
                icon={<Palette size={14} strokeWidth={3} />}
                title="Farba textu"
              />
              {showColorPicker && (
                <div className="absolute top-full left-0 mt-2 bg-white dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl p-2 z-[110] animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="grid grid-cols-3 gap-2">
                    {COLORS.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => applyColor(color.value)}
                        className="w-8 h-8 rounded-lg border-2 border-zinc-300 dark:border-zinc-600 hover:scale-110 transition-transform flex items-center justify-center"
                        style={{
                          backgroundColor:
                            color.value === "inherit"
                              ? "transparent"
                              : color.value,
                        }}
                        title={color.label}
                      >
                        {color.value === "inherit" && (
                          <X size={16} className="text-zinc-400" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-700 mx-1" />
            <ToolbarBtn
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive("bulletList")}
              icon={<List size={14} strokeWidth={3} />}
            />
          </div>

          <div className="flex items-center gap-2">
            <TagButton
              icon={<User size={16} />}
              color={
                activePicker === "contact"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-blue-50 text-blue-500 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800"
              }
              onClick={() =>
                setActivePicker(activePicker === "contact" ? null : "contact")
              }
            >
              {activePicker === "contact" && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-zinc-800 border-2 border-blue-100 dark:border-zinc-700 rounded-3xl shadow-2xl p-2 animate-in slide-in-from-top-2 fade-in duration-200 z-[100]">
                  <PickerHeader
                    title="Kontakty"
                    icon={<User size={14} />}
                    onClose={() => setActivePicker(null)}
                  />
                  <div className="max-h-60 overflow-y-auto">
                    {relations.contacts.map((c) => (
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
              icon={<FolderKanban size={16} />}
              color={
                activePicker === "project"
                  ? "bg-purple-600 text-white border-purple-600"
                  : "bg-purple-50 text-purple-500 border-purple-100 dark:bg-purple-900/20 dark:border-purple-800"
              }
              onClick={() =>
                setActivePicker(activePicker === "project" ? null : "project")
              }
            >
              {activePicker === "project" && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-zinc-800 border-2 border-purple-100 dark:border-zinc-700 rounded-3xl shadow-2xl p-2 animate-in slide-in-from-top-2 fade-in duration-200 z-[100]">
                  <PickerHeader
                    title="Projekty"
                    icon={<FolderKanban size={14} />}
                    onClose={() => setActivePicker(null)}
                  />
                  <div className="max-h-60 overflow-y-auto">
                    {relations.projects.map((p) => (
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
        </div>

        {/* Tiptap Editor Content */}
        <EditorContent editor={editor} className="min-h-[6rem]" />

        {/* Autocomplete Dropdown */}
        <AutocompleteDropdown
          suggestions={suggestions}
          position={position}
          onSelect={(s) => selectSuggestion(s, editor)}
          selectedIndex={selectedIndex}
        />

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
        </div>

        {/* Floating Submit Button */}
        <button
          onClick={(e) => handleSubmit(e)}
          disabled={
            !editor ||
            (editor.isEmpty &&
              !editor.getHTML().includes("data-mention-component"))
          }
          className="absolute bottom-6 right-6 w-14 h-14 bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl flex items-center justify-center shadow-xl transition-all hover:scale-110 active:scale-90 disabled:opacity-20 z-20"
        >
          <Plus size={32} />
        </button>
      </div>
      <style jsx global>{`
        .prose u {
          text-decoration: underline !important;
          text-decoration-style: solid !important;
          text-underline-offset: 2px;
        }
      `}</style>
    </div>
  );
}

function ToolbarBtn({
  onClick,
  isActive,
  icon,
  title,
}: {
  onClick: () => void;
  isActive?: boolean;
  icon: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
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
  onClick,
  children,
}: {
  icon: React.ReactNode;
  color: string;
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

