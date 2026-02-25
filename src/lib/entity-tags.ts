// lib/entity-tags.ts

export const TAG_PATTERNS = {
  contact: /@\s?\\?\[([^\]]+)\]\((\d+)\)/g,   // @ [Meno](ID)
  project: /#\s?\\?\[([^\]]+)\]\((\d+)\)/g,   // # [Názov](ID)
  deal:    /\$\s?\\?\[([^\]]+)\]\((\d+)\)/g,  // $ [Názov](ID)
  note:    /%\s?\\?\[([^\]]+)\]\((\d+)\)/g,   // % [Názov](ID)
  task:    /\^\s?\\?\[([^\]]+)\]\((\d+)\)/g,  // ^ [Názov](ID)
  file:    /&\s?\\?\[([^\]]+)\]\((\d+)\)/g,   // & [Názov](ID)
} as const;

export type EntityType = keyof typeof TAG_PATTERNS;

export interface ParsedTag {
  type: EntityType;
  label: string;
  id: string;
  raw: string;       // Pôvodný string pre replace
}

export const ENTITY_CONFIG: Record<EntityType, {
  prefix: string;
  color: string;           // Tailwind bg class
  textColor: string;       // Tailwind text class
  borderColor: string;
  icon: string;
}> = {
  contact: {
    prefix: '@',
    color: 'bg-violet-500/15',
    textColor: 'text-violet-300',
    borderColor: 'border-violet-500/30',
    icon: '👤',
  },
  project: {
    prefix: '#',
    color: 'bg-blue-500/15',
    textColor: 'text-blue-300',
    borderColor: 'border-blue-500/30',
    icon: '📁',
  },
  deal: {
    prefix: '$',
    color: 'bg-emerald-500/15',
    textColor: 'text-emerald-300',
    borderColor: 'border-emerald-500/30',
    icon: '💼',
  },
  note: {
    prefix: '%',
    color: 'bg-yellow-500/15',
    textColor: 'text-yellow-300',
    borderColor: 'border-yellow-500/30',
    icon: '📝',
  },
  task: {
    prefix: '^',
    color: 'bg-orange-500/15',
    textColor: 'text-orange-300',
    borderColor: 'border-orange-500/30',
    icon: '✅',
  },
  file: {
    prefix: '&',
    color: 'bg-gray-500/15',
    textColor: 'text-gray-300',
    borderColor: 'border-gray-500/30',
    icon: '📄',
  },
};

// Parsovanie textu — nájde všetky tagy
export function parseEntityTags(text: string): ParsedTag[] {
  const tags: ParsedTag[] = [];

  for (const [type, pattern] of Object.entries(TAG_PATTERNS)) {
    const regex = new RegExp(pattern.source, 'g');
    let match;
    while ((match = regex.exec(text)) !== null) {
      tags.push({
        type: type as EntityType,
        label: match[1],
        id: match[2],
        raw: match[0],
      });
    }
  }

  return tags;
}

// Rozdelenie textu na segmenty (text + tagy)
export type TextSegment =
  | { type: 'text'; content: string }
  | { type: 'tag'; tag: ParsedTag };

export function splitIntoSegments(text: string): TextSegment[] {
  const segments: TextSegment[] = [];

  // Kombinovaný pattern pre všetky entity typy (s voliteľnou medzerou a možným escapovaním)
  const combinedPattern = /([@#$%^&])\s?\\?\[([^\]]+)\]\((\d+)\)/g;

  let lastIndex = 0;
  let match;

  while ((match = combinedPattern.exec(text)) !== null) {
    // Text pred tagom
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }

    // Identifikuj typ tagu podľa prvého znaku (prefix z matchu)
    const prefix = match[1];
    const typeMap: Record<string, EntityType> = {
      '@': 'contact', '#': 'project', '$': 'deal',
      '%': 'note', '^': 'task', '&': 'file',
    };

    segments.push({
      type: 'tag',
      tag: {
        type: typeMap[prefix],
        label: match[2],
        id: match[3],
        raw: match[0],
      },
    });

    lastIndex = match.index + match[0].length;
  }

  // Zvyšný text
  if (lastIndex < text.length) {
    segments.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return segments;
}

export function sanitizeUserInput(text: string): string {
  // Odstrániť tag syntax z USER správ — user nesmie injectovať tagy
  return text
    .replace(/@\s?\\?\[([^\]]+)\]\((\d+)\)/g, "$1")
    .replace(/#\s?\\?\[([^\]]+)\]\((\d+)\)/g, "$1")
    .replace(/\$\s?\\?\[([^\]]+)\]\((\d+)\)/g, "$1")
    .replace(/%\s?\\?\[([^\]]+)\]\((\d+)\)/g, "$1")
    .replace(/\^\s?\\?\[([^\]]+)\]\((\d+)\)/g, "$1")
    .replace(/&\s?\\?\[([^\]]+)\]\((\d+)\)/g, "$1");
}
