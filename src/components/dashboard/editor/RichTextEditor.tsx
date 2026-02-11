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
import { MentionNode } from "@/lib/tiptap-mention-node";
import { FontSize } from "@/lib/tiptap-font-size";
import { useAutocomplete } from "@/hooks/useAutocomplete";
import { AutocompleteDropdown } from "@/components/editor/AutocompleteDropdown";
import { useContactPreview } from "@/components/providers/ContactPreviewProvider";
import { useProjectPreview } from "@/components/providers/ProjectPreviewProvider";
import { MenuBar } from "./MenuBar";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({
  content,
  onChange,
  placeholder,
}: RichTextEditorProps) {
  const contactCtx = useContactPreview();
  const projectCtx = useProjectPreview();

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

          if (id) {
            event.preventDefault();
            event.stopPropagation();
            if (type === "project" && projectCtx?.openProject) {
              projectCtx.openProject(id);
            } else if (contactCtx?.openContact) {
              contactCtx.openContact(id);
            }
            return true;
          }
        }
        return false;
      },
    },
  });

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
    </div>
  );
}
