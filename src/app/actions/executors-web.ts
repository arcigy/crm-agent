/**
 * Handles Web Scraping and Search tools using Firecrawl.
 */
export async function executeWebTool(name: string, args: Record<string, any>) {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    return { success: false, error: "Firecrawl API key not found in .env" };
  }

  const fcRequest = async (endpoint: string, body: any) => {
    const res = await fetch(`https://api.firecrawl.dev/v1/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok)
      throw new Error(json.error?.message || json.error || res.statusText);
    return json;
  };

  switch (name) {
    case "web_scrape_page":
      const scrapeRes = await fcRequest("scrape", {
        url: args.url,
        formats: ["markdown"],
      });
      return {
        success: true,
        data: scrapeRes.data?.markdown,
        message: `Stránka ${args.url} bola úspešne stiahnutá.`,
      };

    case "web_crawl_site":
      const crawlRes = await fcRequest("crawl", {
        url: args.url,
        limit: args.limit || 10,
        scrapeOptions: { formats: ["markdown"] },
      });
      return {
        success: true,
        data: { jobId: crawlRes.id },
        message: `Crawl job spustený (ID: ${crawlRes.id}). Použi iný tool na kontrolu stavu.`,
      };

    case "web_search_google":
      const searchRes = await fcRequest("search", {
        query: args.query,
        limit: 5,
        scrapeOptions: { formats: ["markdown"] },
      });
      return {
        success: true,
        data: searchRes.data,
        message: `Nájdené výsledky pre "${args.query}".`,
      };

    case "web_extract_data":
      const extractRes = await fcRequest("scrape", {
        url: args.url,
        formats: ["extract"],
        extract: {
          prompt: args.prompt,
        },
      });
      return {
        success: true,
        data: extractRes.data?.extract,
        message: "Dáta boli úspešne extrahované zo stránky.",
      };

    default:
      throw new Error(`Tool ${name} not found in Web executors`);
  }
}
