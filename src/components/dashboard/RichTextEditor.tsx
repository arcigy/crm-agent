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
} from "lucide-react";
import { MentionNode } from "@/lib/tiptap-mention-node";
import { useAutocomplete } from "@/hooks/useAutocomplete";
import { AutocompleteDropdown } from "@/components/editor/AutocompleteDropdown";
import { Editor } from "@tiptap/react";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

const MenuBar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap gap-1 p-2 bg-muted border-b border-border rounded-t-[2.5rem] transition-colors">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={`p-2 rounded-xl transition-all ${editor.isActive("bold") ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:bg-card hover:text-foreground border border-transparent hover:border-border"}`}
      >
        <Bold className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={`p-2 rounded-xl transition-all ${editor.isActive("italic") ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "text-gray-400 hover:bg-white hover:text-gray-900 border border-transparent hover:border-gray-200"}`}
      >
        <Italic className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`p-2 rounded-xl transition-all ${editor.isActive("underline") ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "text-gray-400 hover:bg-white hover:text-gray-900 border border-transparent hover:border-gray-200"}`}
      >
        <UnderlineIcon className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        className={`p-2 rounded-xl transition-all ${editor.isActive("highlight") ? "bg-amber-400 text-white shadow-lg shadow-amber-100" : "text-gray-400 hover:bg-white hover:text-gray-900 border border-transparent hover:border-gray-200"}`}
      >
        <Highlighter className="w-4 h-4" />
      </button>

      <div className="w-px h-8 bg-gray-200 mx-1 self-center" />

      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all ${editor.isActive("heading", { level: 1 }) ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "text-gray-400 hover:bg-white hover:text-gray-900 border border-transparent hover:border-gray-200"}`}
      >
        H1
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all ${editor.isActive("heading", { level: 2 }) ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "text-gray-400 hover:bg-white hover:text-gray-900 border border-transparent hover:border-gray-200"}`}
      >
        H2
      </button>

      <div className="w-px h-8 bg-gray-200 mx-1 self-center" />

      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-2 rounded-xl transition-all ${editor.isActive("bulletList") ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "text-gray-400 hover:bg-white hover:text-gray-900 border border-transparent hover:border-gray-200"}`}
      >
        <List className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-2 rounded-xl transition-all ${editor.isActive("orderedList") ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "text-gray-400 hover:bg-white hover:text-gray-900 border border-transparent hover:border-gray-200"}`}
      >
        <ListOrdered className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`p-2 rounded-xl transition-all ${editor.isActive("blockquote") ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "text-gray-400 hover:bg-white hover:text-gray-900 border border-transparent hover:border-gray-200"}`}
      >
        <Quote className="w-4 h-4" />
      </button>

      <div className="w-px h-8 bg-border mx-1 self-center" />

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
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bold: { HTMLAttributes: { class: "font-bold" } },
        italic: { HTMLAttributes: { class: "italic" } },
      }),
      Link.configure({ openOnClick: false }),
      TextStyle,
      Color,
      Underline,
      Highlight,
      MentionNode,
      Placeholder.configure({ placeholder: placeholder || "Začnite písať..." }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
      checkAutocomplete(editor);
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base lg:prose-md xl:prose-lg focus:outline-none max-w-none p-8 min-h-[300px] overflow-y-auto custom-scrollbar font-medium text-foreground dark:prose-invert",
      },
    },
  });

  const { suggestions, position, checkAutocomplete, selectSuggestion } =
    useAutocomplete(editor);

  // Update content if it changes externally
  React.useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  return (
    <div className="flex flex-col border border-border rounded-[2.5rem] bg-card shadow-inner min-h-0 flex-1 transition-colors">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} className="flex-1 overflow-hidden" />
      <AutocompleteDropdown
        suggestions={suggestions}
        position={position}
        onSelect={selectSuggestion}
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
        }
        .prose h2 {
          font-weight: 800;
          letter-spacing: -0.03em;
        }
      `}</style>
    </div>
  );
}
