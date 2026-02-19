/**
 * Renders structured note blocks into Tiptap-compatible HTML.
 * This ensures 100% reliability as AI only provides data, and code handles the markup.
 */

export interface NoteBlock {
  type: "h1" | "h2" | "p" | "ul";
  content?: string;
  items?: string[]; // For lists
}

export function renderNoteToHtml(blocks: NoteBlock[]): string {
  if (!Array.isArray(blocks)) return "";

  return blocks
    .map((block) => {
      switch (block.type) {
        case "h1":
          return `<h1 class="text-3xl font-bold tracking-tight mb-4">${processContent(block.content || "")}</h1>`;
        case "h2":
          return `<h2 class="text-2xl font-semibold tracking-tight mt-6 mb-3">${processContent(block.content || "")}</h2>`;
        case "p":
          return `<p class="mb-4 leading-relaxed">${processContent(block.content || "")}</p>`;
        case "ul":
          const items = (block.items || [])
            .map((item) => `<li class="ml-4">${processContent(item)}</li>`)
            .join("");
          return `<ul class="list-disc space-y-2 mb-4">${items}</ul>`;
        default:
          return "";
      }
    })
    .join("");
}

/**
 * Replaces mention placeholders with actual Tiptap Mention HTML nodes.
 * Syntax supported: [[contact:ID|Name]] and [[project:ID|Name]]
 */
function processContent(content: string): string {
  // Replace Contact Mentions
  let processed = content.replace(/\[\[contact:(\d+)\|(.*?)\]\]/g, (_, id, name) => {
    return `<a data-mention-component="" data-contact-id="${id}" data-type="contact" data-label="${name}" class="mention-tag mention-tag-contact" contenteditable="false">👤 ${name}</a>`;
  });

  // Replace Project Mentions
  processed = processed.replace(/\[\[project:(\d+)\|(.*?)\]\]/g, (_, id, name) => {
    return `<a data-mention-component="" data-contact-id="${id}" data-type="project" data-label="${name}" class="mention-tag mention-tag-project" contenteditable="false">📁 ${name}</a>`;
  });

  // Basic styling
  processed = processed.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  processed = processed.replace(/\*(.*?)\*/g, "<em>$1</em>");

  return processed;
}
