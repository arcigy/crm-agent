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
          return `<h1 class="!text-7xl !font-black !tracking-tighter !mb-16 !mt-8 !italic !text-indigo-600 !uppercase !leading-[0.85]">${processedContent}</h1>`;
        case "h2":
          return `<h2 class="!text-5xl !font-black !tracking-tight !mt-32 !mb-12 !border-l-[16px] !border-indigo-600 !pl-12 !uppercase !italic !text-foreground/90 !leading-[1.1]">${processedContent}</h2>`;
        case "callout":
          return `<blockquote class="!p-14 !bg-indigo-50/50 dark:!bg-indigo-950/40 !border-l-[20px] !border-indigo-600 !rounded-r-[4rem] !my-20 !shadow-sm"><p class="!m-0 !font-bold !text-indigo-950 dark:!text-indigo-50 !italic !text-3xl !leading-[1.6] !tracking-tight">${processedContent}</p></blockquote>`;
        case "p":
          return `<p class="!mb-12 !leading-[2.6] !text-2xl !text-foreground/80 font-medium tracking-tight" ${style}>${processedContent}</p>`;
        case "ul":
          const items = (block.items || [])
            .map((item) => `<li class="!mb-8 !text-2xl !leading-[1.8] !pl-4">${processContent(item)}</li>`)
            .join("");
          return `<ul class="!list-disc !marker:text-indigo-600 !ml-16 !mb-20 !space-y-8 !py-6">${items}</ul>`;
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
