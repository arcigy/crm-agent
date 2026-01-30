"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import { Node, mergeAttributes } from "@tiptap/core";
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
import { getTodoRelations } from "@/app/actions/todo-relations";
import { useContactPreview } from "@/components/providers/ContactPreviewProvider";

interface TodoSmartInputProps {
  onAdd: (title: string, time?: string) => void;
}

type PickerType = "contact" | "project" | "deal" | null;

interface Contact {
  id: number;
  first_name: string;
  last_name: string;
  company?: string;
}

interface Project {
  id: number;
  project_type: string;
  stage?: string;
}

interface Relations {
  contacts: Contact[];
  projects: Project[];
  deals: unknown[];
}

interface Suggestion {
  id: number;
  label: string;
  sub?: string;
  type: "contact" | "project";
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

const MentionNode = Node.create({
  name: "mentionComponent",
  group: "inline",
  inline: true,
  selectable: true,
  atom: true, // This allows deleting the whole node with one backspace

  addAttributes() {
    return {
      id: {
        default: null,
      },
      label: {
        default: null,
      },
      type: {
        default: "contact",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "a[data-mention-component]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const type = HTMLAttributes.type;
    const colors = {
      contact:
        "bg-blue-500/10 text-blue-600 border-blue-200 hover:bg-blue-500 hover:text-white",
      project:
        "bg-purple-500/10 text-purple-600 border-purple-200 hover:bg-purple-500 hover:text-white",
    };
    const colorClass = colors[type as keyof typeof colors] || "";

    return [
      "a",
      mergeAttributes(HTMLAttributes, {
        href: "#",
        "data-mention-component": "",
        "data-contact-id": HTMLAttributes.id,
        class: `inline-flex items-center gap-1 px-1.5 py-0.5 rounded border font-black text-[10px] uppercase tracking-tight transition-all mx-1 ${colorClass} cursor-pointer align-middle no-underline`,
        contenteditable: "false",
      }),
      type === "contact" ? "👤 " : "📁 ",
      HTMLAttributes.label,
    ];
  },
});

export function TodoSmartInput({ onAdd }: TodoSmartInputProps) {
  const [time, setTime] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [activePicker, setActivePicker] = useState<PickerType>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [relations, setRelations] = useState<Relations>({
    contacts: [],
    projects: [],
    deals: [],
  });

  // Autocomplete state
  const [autocompleteQuery, setAutocompleteQuery] = useState("");
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<
    Suggestion[]
  >([]);
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const [autocompletePosition, setAutocompletePosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  // Contact preview context
  let openContact: ((id: string | number) => void) | undefined;
  try {
    const ctx = useContactPreview();
    openContact = ctx.openContact;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {}

  // Initialize Tiptap Editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bold: {
          HTMLAttributes: {
            class: "font-bold",
          },
        },
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
        placeholder: "Napíš čo máš na mysli...",
      }),
    ],
    editorProps: {
      attributes: {
        class:
          "outline-none min-h-[12rem] px-8 py-8 pt-16 pb-24 text-xl font-normal text-zinc-900 dark:text-white prose prose-lg max-w-none dark:prose-invert [&_p]:m-0 [&_ul]:m-0 [&_li]:m-0 [&_strong]:font-bold [&_.font-medium]:font-medium [&_.font-black]:font-black",
      },
      handleClick: (view, pos, event) => {
        const target = event.target as HTMLElement;
        const link = target.closest("a");
        if (link) {
          const id = link.getAttribute("data-contact-id");
          if (id && openContact) {
            event.preventDefault();
            event.stopPropagation();
            openContact(id);
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

  // Autocomplete logic with debounce
  useEffect(() => {
    if (!autocompleteQuery || autocompleteQuery.length < 3) {
      setAutocompleteSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      // Filter contacts by query
      const q = autocompleteQuery.toLowerCase();

      const contacts: Suggestion[] = relations.contacts
        .filter((c: any) => {
          const fullName = `${c.first_name} ${c.last_name}`.toLowerCase();
          return fullName.includes(q);
        })
        .map((c: any) => ({
          id: c.id,
          label: `${c.first_name} ${c.last_name}`,
          sub: c.company,
          type: "contact",
        }));

      const projects: Suggestion[] = relations.projects
        .filter((p: any) => {
          return p.project_type.toLowerCase().includes(q);
        })
        .map((p: any) => ({
          id: p.id,
          label: p.project_type,
          sub: p.stage,
          type: "project",
        }));

      setAutocompleteSuggestions([...contacts, ...projects].slice(0, 5));
    }, 1000); // 1 second delay

    return () => clearTimeout(timer);
  }, [autocompleteQuery, relations.contacts]);

  const checkAutocomplete = (editor: ReturnType<typeof useEditor>) => {
    const { state } = editor;
    const { selection } = state;
    const { $from } = selection;

    // Get text before cursor
    const textBefore =
      ($from.nodeBefore as { text?: string } | null)?.text || "";
    const words = textBefore.split(/\s+/);
    const lastWord = words[words.length - 1] || "";

    if (lastWord.length >= 3) {
      setAutocompleteQuery(lastWord);

      // Calculate position for autocomplete dropdown
      const coords = editor.view.coordsAtPos(selection.from);
      if (coords) {
        setAutocompletePosition({
          top: coords.bottom + 5,
          left: coords.left,
        });
      }
    } else {
      setAutocompleteQuery("");
      setAutocompleteSuggestions([]);
    }
  };

  const selectAutocompleteSuggestion = (suggestion: Suggestion) => {
    if (!editor) return;

    // Delete the typed query
    const { state } = editor;
    const { selection } = state;
    const { $from } = selection;
    const textBefore =
      ($from.nodeBefore as { text?: string } | null)?.text || "";
    const words = textBefore.split(/\s+/);
    const lastWord = words[words.length - 1] || "";

    // Delete last word
    editor
      .chain()
      .focus()
      .deleteRange({
        from: selection.from - lastWord.length,
        to: selection.from,
      })
      .run();

    // Insert mention
    // Insert mention
    insertMention(suggestion.label, suggestion.id, suggestion.type);

    // Clear autocomplete
    setAutocompleteQuery("");
    setAutocompleteSuggestions([]);
  };

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
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsFocused(false);
        setActivePicker(null);
        setAutocompleteSuggestions([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadRelations = async () => {
    console.log("Loading relations...");
    try {
      const res = await getTodoRelations();
      console.log("Relations response:", res);
      if (res.success) {
        setRelations(res.data);
        console.log("Relations loaded:", res.data);
      } else {
        console.error("Failed to load relations:", res);
      }
    } catch (error) {
      console.error("Error loading relations:", error);
    }
  };

  const insertMention = (
    text: string,
    id: string | number,
    type: "contact" | "project",
  ) => {
    if (!editor) return;

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
    if (editor && !editor.isEmpty) {
      const html = editor.getHTML();
      onAdd(html, time);
      editor.commands.clearContent();
      setTime("");
      localStorage.removeItem("todo-draft");
      setActivePicker(null);
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
        {/* Formatting Toolbar */}
        {isFocused && (
          <div className="absolute top-4 left-8 right-8 flex items-center gap-2 z-40 animate-in fade-in slide-in-from-bottom-1 duration-200">
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
                <div className="absolute top-full left-0 mt-2 bg-white dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
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
        )}

        {/* Tiptap Editor Content */}
        <EditorContent editor={editor} className="min-h-[12rem]" />

        {/* Autocomplete Dropdown */}
        {isMounted &&
          autocompleteSuggestions.length > 0 &&
          autocompletePosition &&
          createPortal(
            <div
              className="fixed bg-white dark:bg-zinc-800 border-2 border-blue-100 dark:border-zinc-700 rounded-2xl shadow-2xl p-2 z-[99999] min-w-[200px] animate-in fade-in zoom-in-95 duration-100"
              style={{
                top: `${autocompletePosition.top}px`,
                left: `${autocompletePosition.left}px`,
              }}
            >
              {autocompleteSuggestions.map((suggestion) => (
                <div
                  key={`${suggestion.type}-${suggestion.id}`}
                  onClick={() => selectAutocompleteSuggestion(suggestion)}
                  onMouseDown={(e) => e.preventDefault()}
                  className="flex items-center gap-2 p-2 rounded-xl hover:bg-blue-50 dark:hover:bg-zinc-700 cursor-pointer transition-all group"
                >
                  <div
                    className={`p-1.5 rounded-lg ${suggestion.type === "contact" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600" : "bg-purple-100 dark:bg-purple-900/30 text-purple-600"}`}
                  >
                    {suggestion.type === "contact" ? (
                      <User size={14} strokeWidth={3} />
                    ) : (
                      <FolderKanban size={14} strokeWidth={3} />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {suggestion.label}
                    </span>
                    {suggestion.sub && (
                      <span className="text-[10px] uppercase font-bold text-zinc-400">
                        {suggestion.sub}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>,
            document.body,
          )}

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
            onClick={() =>
              setActivePicker(activePicker === "contact" ? null : "contact")
            }
          >
            {activePicker === "contact" && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-zinc-800 border-2 border-blue-100 dark:border-zinc-700 rounded-3xl shadow-2xl p-2 animate-in slide-in-from-top-2 fade-in duration-200 z-[60]">
                <PickerHeader
                  title="Kontakty"
                  icon={<User size={14} />}
                  onClose={() => setActivePicker(null)}
                />
                <div className="max-h-60 overflow-y-auto">
                  {(() => {
                    console.log("Rendering contacts:", relations.contacts);
                    return relations.contacts.map((c) => (
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
                    ));
                  })()}
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
            onClick={() =>
              setActivePicker(activePicker === "project" ? null : "project")
            }
          >
            {activePicker === "project" && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-zinc-800 border-2 border-purple-100 dark:border-zinc-700 rounded-3xl shadow-2xl p-2 animate-in slide-in-from-top-2 fade-in duration-200 z-[60]">
                <PickerHeader
                  title="Projekty"
                  icon={<FolderKanban size={14} />}
                  onClose={() => setActivePicker(null)}
                />
                <div className="max-h-60 overflow-y-auto">
                  {(() => {
                    console.log("Rendering projects:", relations.projects);
                    return relations.projects.map((p) => (
                      <PickerItem
                        key={p.id}
                        title={p.project_type}
                        sub={p.stage}
                        onClick={() =>
                          insertMention(p.project_type, p.id, "project")
                        }
                      />
                    ));
                  })()}
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

function HintBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-zinc-400 opacity-60">
      {icon} {label}
    </span>
  );
}
