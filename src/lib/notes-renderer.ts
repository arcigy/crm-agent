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
          return `<h1 class="!text-7xl !font-black !tracking-tighter !mb-12 !mt-4 !italic !text-indigo-600 !uppercase !leading-[0.9]">${processedContent}</h1>`;
        case "h2":
          return `<h2 class="!text-5xl !font-black !tracking-tight !mt-20 !mb-10 !border-l-[12px] !border-indigo-600 !pl-10 !uppercase !italic !text-foreground/90 !leading-tight">${processedContent}</h2>`;
        case "callout":
          return `<blockquote class="!p-12 !bg-indigo-50 dark:!bg-indigo-950/40 !border-l-[16px] !border-indigo-600 !rounded-r-[3rem] !my-16"><p class="!m-0 !font-bold !text-indigo-950 dark:!text-indigo-50 !italic !text-2xl !leading-relaxed !tracking-tight">${processedContent}</p></blockquote>`;
        case "p":
          return `<p class="!mb-10 !leading-[2.4] !text-2xl !text-foreground/90 font-medium tracking-tight" ${style}>${processedContent}</p>`;
        case "ul":
          const items = (block.items || [])
            .map((item) => `<li class="!mb-6 !text-2xl !leading-relaxed !pl-2">${processContent(item)}</li>`)
            .join("");
          return `<ul class="!list-disc !marker:text-indigo-600 !ml-12 !mb-16 !space-y-6 !py-4">${items}</ul>`;
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

  // Rich inline formatting with !important colors
  processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong class="!font-black !text-indigo-600">$1</strong>');
  processed = processed.replace(/\*(.*?)\*/g, '<em class="!italic !text-muted-foreground/60">$1</em>');
  
  // Custom color tags with robust regex
  processed = processed.replace(/\[color:\s*(#[a-fA-F0-0]{3,6})\s*\](.*?)\[\/color\]/gi, '<span style="color: $1 !important; font-weight: 800;">$2</span>');
  processed = processed.replace(/\[color:\s*([a-zA-Z]+)\s*\](.*?)\[\/color\]/gi, '<span style="color: $1 !important; font-weight: 800;">$2</span>');

  return processed;
}
