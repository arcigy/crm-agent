import { scrapePage } from '@/lib/scraper/web-scraper';
import { crawlSite } from '@/lib/scraper/crawler';
import { extractStructuredData } from '@/lib/scraper/extractor';
import { webSearch } from '@/lib/scraper/search';

export async function executeWebTool(name: string, args: Record<string, any>) {
  switch (name) {
    case 'web_scrape_page':
      return await executeWebScrape(args as { url: string });
    case 'web_crawl_site':
      return await executeWebCrawl(args as { url: string; maxPages?: number; maxDepth?: number });
    case 'web_search_google':
      return await executeWebSearch(args as { query: string; maxResults?: number });
    case 'web_extract_data':
      return await executeWebExtract(args as { url: string; schema: any; prompt?: string });
    default:
      throw new Error(`Tool ${name} not found in Web executors`);
  }
}

async function executeWebScrape(args: { url: string }) {
  try {
    const result = await scrapePage(args.url);

    // Skrátiť pre agenta — max 6000 slov
    const truncated = result.markdown.split(/\s+/).slice(0, 6000).join(' ');

    return {
      success: true,
      data: {
        url: result.url,
        title: result.title,
        content: truncated,
        wordCount: result.wordCount,
        renderedWithBrowser: result.renderedWithBrowser,
        scrapedAt: result.scrapedAt,
      },
      message: `Stránka ${args.url} bola úspešne stiahnutá.`,
    };
  } catch (error) {
    return {
      success: false,
      error: `Web scraping zlyhal: ${(error as Error).message}`,
      retryable: false,
    };
  }
}

async function executeWebCrawl(args: { url: string; maxPages?: number; maxDepth?: number }) {
  try {
    const results = await crawlSite(args.url, {
      maxPages: args.maxPages ?? 10,
      maxDepth: args.maxDepth ?? 2,
    });

    return {
      success: true,
      data: {
        pagesFound: results.length,
        pages: results.map(r => ({
          url: r.url,
          title: r.title,
          excerpt: r.markdown.slice(0, 300),
          depth: r.depth,
        })),
      },
      message: `Nájdených ${results.length} stránok na webe ${args.url}.`,
    };
  } catch (error) {
    return {
      success: false,
      error: `Web crawl zlyhal: ${(error as Error).message}`,
      retryable: false,
    };
  }
}

async function executeWebSearch(args: { query: string; maxResults?: number }) {
  try {
    const results = await webSearch(args.query, args.maxResults ?? 5);

    return {
      success: true,
      data: results,
      message: `Nájdené výsledky pre "${args.query}".`,
    };
  } catch (error) {
    // Ak search zlyhá kvôli API kľúču, pripojíme hlášku pre Option C
    const message = (error as Error).message;
    if (message.includes('not configured')) {
      return {
        success: false,
        isQuotaError: true,
        error: "Služba web search nemá prepojený API kľúč (Brave Search API), resp. limit bol prekročený.",
      };
    }
    return {
      success: false,
      error: `Web search zlyhal: ${message}`,
      retryable: false,
    };
  }
}

async function executeWebExtract(args: { url: string; schema?: any; prompt?: string }) {
  try {
    const scraped = await scrapePage(args.url);
    
    // Fallback schema if only prompt is provided
    let schemaToUse = args.schema;
    if (!schemaToUse && args.prompt) {
      schemaToUse = { 
        extracted_info: { 
          type: "string", 
          description: args.prompt 
        } 
      };
    }

    const extracted = await extractStructuredData(scraped.markdown, schemaToUse, args.url);

    return {
      success: true,
      data: extracted,
      message: "Dáta boli úspešne extrahované zo stránky.",
    };
  } catch (error) {
    return {
      success: false,
      error: `Data extraction zlyhal: ${(error as Error).message}`,
      retryable: true,
    };
  }
}
