import { ToolDefinition } from "../agent-types";

export const WEB_ATOMS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "web_scrape_page",
      description:
        "Downloads and reads the content of a single webpage (returns Markdown).",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "Page URL" },
        },
        required: ["url"],
      },
      producesEntityKey: undefined,
      requiredEntityKeys: [],
      isParallelSafe: true,
    },
  },
  {
    type: "function",
    function: {
      name: "web_crawl_site",
      description:
        "Crawls an entire website (including subpages) and maps it.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "Main website URL" },
          limit: {
            type: "number",
            default: 10,
            description: "Max number of pages to crawl",
          },
        },
        required: ["url"],
      },
      producesEntityKey: undefined,
      requiredEntityKeys: [],
      isParallelSafe: false,
    },
  },
  {
    type: "function",
    function: {
      name: "web_search_google",
      description:
        "Searches for information on the internet (Google Search via Firecrawl).",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query (e.g., 'Finstat ArciGy')",
          },
        },
        required: ["query"],
      },
      producesEntityKey: undefined,
      requiredEntityKeys: [],
      isParallelSafe: true,
    },
  },
  {
    type: "function",
    function: {
      name: "web_extract_data",
      description:
        "Intelligently extracts structured data from a URL based on a specified schema.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string" },
          prompt: {
            type: "string",
            description: "What to extract (e.g., 'All product prices')",
          },
        },
        required: ["url", "prompt"],
      },
      producesEntityKey: undefined,
      requiredEntityKeys: [],
      isParallelSafe: true,
    },
  },
];
