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
        parseHTML: (element) => element.getAttribute("data-contact-id"),
        renderHTML: (attributes) => ({
          "data-contact-id": attributes.id,
        }),
      },
      label: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-label") || element.innerText?.replace(/^[👤📁]\s/, ""),
        renderHTML: (attributes) => ({
          "data-label": attributes.label,
        }),
      },
      type: {
        default: "contact",
        parseHTML: (element) => element.getAttribute("data-type") || "contact",
        renderHTML: (attributes) => ({
          "data-type": attributes.type,
        }),
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
        "data-contact-id": HTMLAttributes.id || "",
        "data-type": type,
        class: `mention-tag ${typeClass}`,
        contenteditable: "false",
        style: "user-select: none;",
      }),

      type === "contact" ? "👤 " : "📁 ",
      HTMLAttributes.label || "Záznam",
    ];
  },
});
