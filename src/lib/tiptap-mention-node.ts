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
        renderHTML: (attributes) => {
          if (!attributes.id) return {};
          return { "data-contact-id": attributes.id };
        },
      },
      label: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-label") || element.innerText?.replace(/^[👤📁]\s/, "").trim(),
        renderHTML: (attributes) => {
          if (!attributes.label) return {};
          return { "data-label": attributes.label };
        },
      },
      type: {
        default: "contact",
        parseHTML: (element) => element.getAttribute("data-type") || "contact",
        renderHTML: (attributes) => {
          if (!attributes.type) return {};
          return { "data-type": attributes.type };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "a[data-mention-component]",
        getAttrs: (element) => {
          if (typeof element === "string") return false;
          return {
            id: element.getAttribute("data-contact-id"),
            label: element.getAttribute("data-label"),
            type: element.getAttribute("data-type") || "contact",
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const type = HTMLAttributes["data-type"] || HTMLAttributes.type || "contact";
    const typeClass = type === "project" ? "mention-tag-project" : "mention-tag-contact";
    const label = HTMLAttributes["data-label"] || HTMLAttributes.label || "Záznam";
    const id = HTMLAttributes["data-contact-id"] || HTMLAttributes.id || "";

    return [
      "a",
      mergeAttributes(HTMLAttributes, {
        href: "#",
        "data-mention-component": "",
        "data-contact-id": id,
        "data-type": type,
        "data-label": label,
        class: `mention-tag ${typeClass}`,
        contenteditable: "false",
        style: "user-select: none;",
      }),
      type === "contact" ? "👤 " : "📁 ",
      label,
    ];
  },
});
