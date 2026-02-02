"use client";
import * as React from "react";

import { useEditor, EditorContent } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Link } from "@tiptap/extension-link";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { Underline } from "@tiptap/extension-underline";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Highlight } from "@tiptap/extension-highlight";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Highlighter,
  Type,
  Baseline,
  Link as LinkIcon,
  ChevronDown,
} from "lucide-react";
import { MentionNode } from "@/lib/tiptap-mention-node";
import { FontSize } from "@/lib/tiptap-font-size";
import { useAutocomplete } from "@/hooks/useAutocomplete";
import { AutocompleteDropdown } from "@/components/editor/AutocompleteDropdown";
import { Editor } from "@tiptap/react";
import { useContactPreview } from "@/components/providers/ContactPreviewProvider";
import { useProjectPreview } from "@/components/providers/ProjectPreviewProvider";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

const MenuBar = ({ editor, onLinkOpen }: { editor: Editor | null, onLinkOpen: () => void }) => {
  const [activeMenu, setActiveMenu] = React.useState<'color' | 'highlight' | 'size' | null>(null);

  if (!editor) return null;

  const colors = [
    { name: 'Default', color: 'inherit' },
    { name: 'Blue', color: '#3b82f6' },
    { name: 'Green', color: '#10b981' },
    { name: 'Red', color: '#ef4444' },
    { name: 'Amber', color: '#f59e0b' },
    { name: 'Purple', color: '#8b5cf6' },
  ];

  const highlights = [
    { name: 'None', color: 'transparent' },
    { name: 'Yellow', color: '#fef08a' },
    { name: 'Green', color: '#bbf7d0' },
    { name: 'Blue', color: '#bfdbfe' },
    { name: 'Pink', color: '#fbcfe8' },
  ];

  const sizes = [
    { name: 'Small', value: '0.875rem' },
    { name: 'Normal', value: '1rem' },
    { name: 'Large', value: '1.25rem' },
    { name: 'Extra Large', value: '1.5rem' },
  ];

  const currentColor = editor.getAttributes('textStyle').color || 'inherit';
  const currentHighlight = editor.getAttributes('highlight').color || 'transparent';

  return (
    <div className="flex flex-wrap gap-1 p-2 bg-muted border-b border-border rounded-t-[2.5rem] transition-colors relative z-50">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-2 rounded-xl transition-all ${editor.isActive("bold") ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:bg-card hover:text-foreground border border-transparent hover:border-border"}`}
        title="Tučné písmo"
      >
        <Bold className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-2 rounded-xl transition-all ${editor.isActive("italic") ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:bg-card hover:text-foreground border border-transparent hover:border-border"}`}
        title="Kurzíva"
      >
        <Italic className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`p-2 rounded-xl transition-all ${editor.isActive("underline") ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:bg-card hover:text-foreground border border-transparent hover:border-border"}`}
        title="Podčiarknuté"
      >
        <UnderlineIcon className="w-4 h-4" />
      </button>

      <div className="w-px h-8 bg-border/50 mx-1 self-center" />

      {/* Text Color Dropdown */}
      <div className="relative">
        <button
          onClick={() => setActiveMenu(activeMenu === 'color' ? null : 'color')}
          className={`p-2 rounded-xl text-gray-400 hover:bg-card hover:text-foreground border border-transparent hover:border-border transition-all flex items-center gap-1 ${activeMenu === 'color' ? 'bg-card border-border' : ''}`}
        >
          <Baseline className="w-4 h-4" style={{ color: currentColor !== 'inherit' ? currentColor : undefined }} />
          <ChevronDown className="w-3 h-3 opacity-50" />
        </button>
        {activeMenu === 'color' && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setActiveMenu(null)} />
            <div className="absolute top-full left-0 mt-1 flex flex-col bg-card border border-border rounded-xl shadow-xl z-50 p-1 min-w-[140px] animate-in fade-in zoom-in-95 duration-150">
              {colors.map((c) => (
                <button
                  key={c.color}
                  onClick={() => {
                    editor.chain().focus().setColor(c.color).run();
                    setActiveMenu(null);
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold hover:bg-muted rounded-lg transition-colors ${currentColor === c.color ? 'bg-muted text-indigo-600' : 'text-foreground'}`}
                >
                  <div className="w-3 h-3 rounded-full border border-border" style={{ backgroundColor: c.color === 'inherit' ? 'currentColor' : c.color }} />
                  {c.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Highlight Dropdown */}
      <div className="relative">
        <button
          onClick={() => setActiveMenu(activeMenu === 'highlight' ? null : 'highlight')}
          className={`p-2 rounded-xl text-gray-400 hover:bg-card hover:text-foreground border border-transparent hover:border-border transition-all flex items-center gap-1 ${activeMenu === 'highlight' ? 'bg-card border-border' : ''}`}
        >
          <Highlighter className="w-4 h-4" style={{ color: currentHighlight !== 'transparent' ? currentHighlight : undefined }} />
          <ChevronDown className="w-3 h-3 opacity-50" />
        </button>
        {activeMenu === 'highlight' && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setActiveMenu(null)} />
            <div className="absolute top-full left-0 mt-1 flex flex-col bg-card border border-border rounded-xl shadow-xl z-50 p-1 min-w-[140px] animate-in fade-in zoom-in-95 duration-150">
              {highlights.map((h) => (
                <button
                  key={h.color}
                  onClick={() => {
                    editor.chain().focus().setHighlight({ color: h.color }).run();
                    setActiveMenu(null);
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold hover:bg-muted rounded-lg transition-colors ${currentHighlight === h.color ? 'bg-muted text-indigo-600' : 'text-foreground'}`}
                >
                  <div className="w-3 h-3 rounded border border-border" style={{ backgroundColor: h.color }} />
                  {h.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Text Size Dropdown */}
      <div className="relative">
        <button
          onClick={() => setActiveMenu(activeMenu === 'size' ? null : 'size')}
          className={`p-2 rounded-xl text-gray-400 hover:bg-card hover:text-foreground border border-transparent hover:border-border transition-all flex items-center gap-1 ${activeMenu === 'size' ? 'bg-card border-border' : ''}`}
        >
          <Type className="w-4 h-4" />
          <ChevronDown className="w-3 h-3 opacity-50" />
        </button>
        {activeMenu === 'size' && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setActiveMenu(null)} />
            <div className="absolute top-full left-0 mt-1 flex flex-col bg-card border border-border rounded-xl shadow-xl z-50 p-1 min-w-[140px] animate-in fade-in zoom-in-95 duration-150">
              {sizes.map((s) => (
                <button
                  key={s.value}
                  onClick={() => {
                    editor.chain().focus().setFontSize(s.value).run();
                    setActiveMenu(null);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold hover:bg-muted rounded-lg transition-colors text-foreground"
                >
                  <span style={{ fontSize: s.value }}>{s.name}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="w-px h-8 bg-border/50 mx-1 self-center" />

      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all ${editor.isActive("heading", { level: 1 }) ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:bg-card hover:text-foreground border border-transparent hover:border-border"}`}
        title="Nadpis 1 (Veľký)"
      >
        H1
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all ${editor.isActive("heading", { level: 2 }) ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:bg-card hover:text-foreground border border-transparent hover:border-border"}`}
        title="Nadpis 2 (Stredný)"
      >
        H2
      </button>

      <div className="w-px h-8 bg-border/50 mx-1 self-center" />

      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-2 rounded-xl transition-all ${editor.isActive("bulletList") ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:bg-card hover:text-foreground border border-transparent hover:border-border"}`}
        title="Odrážkový zoznam"
      >
        <List className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-2 rounded-xl transition-all ${editor.isActive("orderedList") ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:bg-card hover:text-foreground border border-transparent hover:border-border"}`}
        title="Číslovaný zoznam"
      >
        <ListOrdered className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`p-2 rounded-xl transition-all ${editor.isActive("blockquote") ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:bg-card hover:text-foreground border border-transparent hover:border-border"}`}
        title="Citácia"
      >
        <Quote className="w-4 h-4" />
      </button>

      <div className="w-px h-8 bg-border/50 mx-1 self-center" />

      <button
        onClick={onLinkOpen}
        className={`p-2 rounded-xl text-gray-400 hover:bg-card hover:text-foreground border border-transparent hover:border-border transition-all flex items-center gap-1 font-bold text-xs`}
        title="Prepojiť (Kontakt, Projekt...)"
      >
        <LinkIcon className="w-4 h-4" />
        <span className="hidden sm:inline">Prepojiť</span>
      </button>

      <div className="flex-1" />

      <button
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().chain().focus().undo().run()}
        className="p-2 rounded-xl text-gray-400 hover:bg-card hover:text-foreground transition-all disabled:opacity-20"
      >
        <Undo className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().chain().focus().redo().run()}
        className="p-2 rounded-xl text-gray-400 hover:bg-card hover:text-foreground transition-all disabled:opacity-20"
      >
        <Redo className="w-4 h-4" />
      </button>
    </div>
  );
};

export default function RichTextEditor({
  content,
  onChange,
  placeholder,
}: RichTextEditorProps) {
  // Preview contexts
  let openContact: ((id: string | number) => void) | undefined;
  let openProject: ((id: string | number) => void) | undefined;

  try {
    const contactCtx = useContactPreview();
    openContact = contactCtx.openContact;
  } catch (e) {}

  try {
    const projectCtx = useProjectPreview();
    openProject = projectCtx.openProject;
  } catch (e) {}

  const {
    suggestions,
    position,
    selectedIndex,
    checkAutocomplete,
    selectSuggestion,
    handleKeyDown,
  } = useAutocomplete();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bold: { HTMLAttributes: { class: "font-bold" } },
        italic: { HTMLAttributes: { class: "italic" } },
      }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          class: 'text-indigo-600 hover:text-indigo-800 underline transition-colors cursor-pointer',
          target: '_blank',
          rel: 'noopener noreferrer'
        }
      }),
      TextStyle,
      FontSize,
      Color,
      Underline,
      Highlight.configure({ multicolor: true }),
      MentionNode,
      Placeholder.configure({ placeholder: placeholder || "Začnite písať..." }),
    ],
    immediatelyRender: false,
    content: content,
    onUpdate: ({ editor: updatedEditor }) => {
      onChange(updatedEditor.getHTML());
      checkAutocomplete(updatedEditor);
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base lg:prose-md xl:prose-lg focus:outline-none max-w-none p-8 min-h-[300px] overflow-y-auto custom-scrollbar font-medium text-foreground dark:prose-invert",
      },
      handleKeyDown: (view, event) => {
        if (!editor) return false;
        return handleKeyDown(event, editor);
      },
      handleClick: (view, pos, event) => {
        const target = event.target as HTMLElement;
        const mention = target.closest("[data-contact-id]");
        if (mention) {
          const id = mention.getAttribute("data-contact-id");
          const type = mention.getAttribute("data-type") || "contact";

          if (id && (openContact || openProject)) {
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
  });

  // Update content if it changes externally
  React.useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  return (
    <div className="flex flex-col border border-border rounded-[2.5rem] bg-card shadow-inner min-h-0 flex-1 transition-colors">
      <MenuBar editor={editor} onLinkOpen={() => {
        if (editor) {
          editor.chain().focus().insertContent("@").run();
          checkAutocomplete(editor);
        }
      }} />
      <EditorContent editor={editor} className="flex-1 overflow-hidden" />
      <AutocompleteDropdown
        suggestions={suggestions}
        position={position}
        onSelect={(s) => selectSuggestion(s, editor)}
        selectedIndex={selectedIndex}
      />

      <style jsx global>{`
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }
        .ProseMirror:focus {
          outline: none;
        }
        .prose u {
          text-decoration: underline;
          text-decoration-style: solid !important;
          text-underline-offset: 2px;
        }
        .prose h1 {
          font-weight: 900;
          letter-spacing: -0.05em;
          font-style: italic;
          margin-top: 1.5em;
          margin-bottom: 0.5em;
        }
        .prose h2 {
          font-weight: 800;
          letter-spacing: -0.03em;
          margin-top: 1.2em;
          margin-bottom: 0.4em;
        }
        .prose ul {
          list-style-type: disc !important;
          padding-left: 1.5em !important;
          margin: 1em 0 !important;
        }
        .prose ol {
          list-style-type: decimal !important;
          padding-left: 1.5em !important;
          margin: 1em 0 !important;
        }
        .prose li {
          margin: 0.25em 0 !important;
          display: list-item !important;
        }
        .prose blockquote {
          border-left: 4px solid #6366f1;
          padding-left: 1em;
          font-style: italic;
          color: #6366f1;
          background: rgba(99, 102, 241, 0.05);
          margin: 1.5em 0;
          padding: 1em;
          border-radius: 0 1rem 1rem 0;
        }
        .prose a {
          cursor: pointer !important;
          pointer-events: auto !important;
        }
      `}</style>
    </div>
  );
}
