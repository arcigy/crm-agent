import { Node, mergeAttributes } from "@tiptap/core";

export const MentionNode = Node.create({
  name: "mentionComponent",
  group: "inline",
  inline: true,
  selectable: true,
  draggable: false,
  atom: true,

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
        // user-select: all helps treat it as one block for selection/deletion
        class: `inline-flex items-center gap-1 px-1.5 py-0.5 rounded border font-black text-[10px] uppercase tracking-tight transition-all mx-1 ${colorClass} cursor-default align-middle no-underline select-all`,
        contenteditable: "false",
      }),
      type === "contact" ? "👤 " : "📁 ",
      HTMLAttributes.label,
    ];
  },
});
