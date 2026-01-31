import { Node, mergeAttributes } from "@tiptap/core";

export const MentionNode = Node.create({
  name: "mentionComponent",
  group: "inline",
  inline: true,
  selectable: false,
  draggable: false,
  atom: true,
  isolating: true,

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
    const type = HTMLAttributes.type || "contact";
    const typeClass =
      type === "project" ? "mention-tag-project" : "mention-tag-contact";

    return [
      "a",
      mergeAttributes(HTMLAttributes, {
        href: "#",
        "data-mention-component": "",
        "data-contact-id": HTMLAttributes.id,
        "data-type": type,
        class: `mention-tag ${typeClass}`,
        contenteditable: "false",
        style: "user-select: none;",
      }),

      type === "contact" ? "👤 " : "📁 ",
      HTMLAttributes.label,
    ];
  },
});
