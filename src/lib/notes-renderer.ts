/**
 * Renders structured note blocks into Tiptap-compatible HTML.
 * This ensures 100% reliability as AI only provides data, and code handles the markup.
 */

export interface NoteBlock {
  type: "h1" | "h2" | "p" | "ul" | "callout";
  content?: string;
  items?: string[];
  color?: string; // e.g. "#6366f1"
  highlight?: string; // e.g. "#e0e7ff"
}

export function renderNoteToHtml(blocks: NoteBlock[]): string {
  if (!Array.isArray(blocks)) return "";

  return blocks
    .map((block) => {
      const style = block.color ? `style="color: ${block.color}"` : "";
      const highlightStyle = block.highlight ? `style="background-color: ${block.highlight}; padding: 0.1rem 0.3rem; border-radius: 0.3rem;"` : "";
      const processedContent = processContent(block.content || "");

      switch (block.type) {
        case "h1":
          return `<h1 class="text-6xl font-black tracking-tighter mb-8 italic text-indigo-600 uppercase transition-all">${processedContent}</h1>`;
        case "h2":
          return `<h2 class="text-4xl font-black tracking-tight mt-12 mb-6 border-l-8 border-indigo-500 pl-6 uppercase italic text-foreground/80">${processedContent}</h2>`;
        case "callout":
          return `<div class="p-6 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-500/20 rounded-3xl my-6"><p class="m-0 font-medium text-indigo-900 dark:text-indigo-100 italic">${processedContent}</p></div>`;
        case "p":
          return `<p class="mb-5 leading-loose text-foreground/90" ${style}>${processedContent}</p>`;
        case "ul":
          const items = (block.items || [])
            .map((item) => `<li class="ml-6 mb-2 list-disc marker:text-indigo-500">${processContent(item)}</li>`)
            .join("");
          return `<ul class="mb-6 space-y-2">${items}</ul>`;
        default:
          return "";
      }
    })
    .join("");
}

function processContent(content: string): string {
  if (!content) return "";
  
  let processed = content;

  // Replace Contact Mentions with robust label support
  processed = processed.replace(/\[\[contact:(\d+)\|(.*?)\]\]/g, (_, id, name) => {
    return `<a data-mention-component="" data-contact-id="${id}" data-type="contact" data-label="${name}" class="mention-tag mention-tag-contact" contenteditable="false">👤 ${name}</a>`;
  });

  // Replace Project Mentions with robust label support
  processed = processed.replace(/\[\[project:(\d+)\|(.*?)\]\]/g, (_, id, name) => {
    return `<a data-mention-component="" data-contact-id="${id}" data-type="project" data-label="${name}" class="mention-tag mention-tag-project" contenteditable="false">📁 ${name}</a>`;
  });

  // Rich inline formatting
  processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong class="font-black text-indigo-600">$1</strong>');
  processed = processed.replace(/\*(.*?)\*/g, '<em class="italic text-muted-foreground">$1</em>');
  
  // Color placeholders if AI sends them (e.g. [color:#ff0000]text[/color])
  processed = processed.replace(/\[color:(.*?)\](.*?)\[\/color\]/g, '<span style="color: $1">$2</span>');

  return processed;
}
