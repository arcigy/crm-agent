import { ColdLeadItem } from "@/app/actions/cold-leads";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Helper: Domain Name Extraction (Pure Logic)
function getCleanNameFromDomain(website: string): string | null {
    if (!website) return null;
    try {
        let clean = website.toLowerCase().trim();
        clean = clean.replace(/^https?:\/\//, "").replace(/^www\./, "");
        if (clean.includes("/")) clean = clean.split("/")[0];
        
        const parts = clean.split(".");
        let name = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
        
        const generics = ["gmail", "outlook", "yahoo", "zoznam", "azet", "centrum", "facebook", "instagram", "linkedin", "google"];
        if (generics.includes(name)) return null;

        return name.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    } catch (e) {
        return null;
    }
}

// Helper: Strip City
function stripCity(name: string, city?: string): string {
    if (!city || !name) return name;
    const regex = new RegExp(`[\\s\\-,]+${city}$`, "i");
    if (regex.test(name)) {
        const cleaned = name.replace(regex, "").trim();
        return cleaned.length > 2 ? cleaned : name; 
    }
    return name;
}

// 1. Custom Website Scraper (No External Service)
// 1. Custom Website Scraper (No External Service)
export async function scrapeWebsite(url: string): Promise<string | null> {
    if (!url) return null;
    
    // Helper to fetch and clean text
    const fetchAndClean = async (targetUrl: string): Promise<{ text: string, html: string } | null> => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout per page

            const res = await fetch(targetUrl, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
                },
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!res.ok) return null;
            
            const html = await res.text();
            let text = html;
            
            // Basic HTML to Text Conversion
            text = text.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "");
            text = text.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, "");
            text = text.replace(/<head\b[^>]*>([\s\S]*?)<\/head>/gim, "");
            text = text.replace(/<!--[\s\S]*?-->/g, "");
            text = text.replace(/<\/div>|<\/p>|<\/li>|<\/h[1-6]>/gim, "\n");
            text = text.replace(/<br\s*\/?>/gim, "\n");
            text = text.replace(/<[^>]+>/g, " ");
            text = text.replace(/\s+/g, " ").trim();
            
            return { text, html };
        } catch (e) {
            console.error(`Scrape Error (${targetUrl}):`, e);
            return null;
        }
    };

    try {
        // 1. Fetch Homepage
        const home = await fetchAndClean(url);
        if (!home) return null;

        let combinedText = `--- HOMEPAGE ---\n${home.text}`;

        // 2. Find meaningful subpage (Services > Products > About)
        // Regex to find hrefs. 
        // We look for common keywords in the link URL or checking near the link tag might be too complex for regex, so we rely on URL keywords.
        const linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/gi;
        let match;
        const links: string[] = [];
        
        while ((match = linkRegex.exec(home.html)) !== null) {
            links.push(match[2]);
        }

        // Keywords to prioritize
        const keywords = ["sluzby", "services", "produkty", "products", "o-nas", "about", "offer", "ponuka"];
        let bestSubLink: string | null = null;

        for (const kw of keywords) {
            const found = links.find(l => l.toLowerCase().includes(kw));
            if (found) {
                bestSubLink = found;
                break;
            }
        }

        // 3. Fetch Subpage if found
        if (bestSubLink) {
            try {
                // Handle relative URLs
                const subUrl = new URL(bestSubLink, url).toString();
                // Avoid scraping the same page or external sites (simple check)
                if (subUrl !== url && subUrl.startsWith(url) || subUrl.includes(new URL(url).hostname)) {
                     const sub = await fetchAndClean(subUrl);
                     if (sub && sub.text.length > 50) {
                         combinedText += `\n\n--- SUBPAGE (${new URL(subUrl).pathname}) ---\n${sub.text}`;
                     }
                }
            } catch (e) {
                // Ignore URL parsing errors
            }
        }

        return combinedText;

    } catch (e) {
        console.error("Master Scrape Error:", e);
        return null; // Should not happen as handled inside
    }
}

// 2. Generate Personalization using Gemini SDK
export async function generatePersonalization(lead: ColdLeadItem, scrapedContent: string | null) {
    const { title, website, city, category, abstract, fallback_url } = lead;
    
    // Determine Name
    let businessName = getCleanNameFromDomain(website || "") || title;
    businessName = businessName.replace(/\s*s\.r\.o\.?.*$/i, "").replace(/\s*spol\. s r\.o\..*$/i, "").replace(/\s*a\.s\.?.*$/i, "").trim();
    if (city) businessName = stripCity(businessName, city);

    // Context Source
    let contextText = "";
    if (scrapedContent && scrapedContent.length > 50) {
        contextText = `Website/Source Content:\n${scrapedContent.slice(0, 8000)}`; 
    } else if (abstract && abstract.length > 10) {
        contextText = `Abstract:\n${abstract}`;
    } else if (fallback_url) {
         contextText = `Source URL provided but not scraped: ${fallback_url}. Category: ${category}`;
    } else {
        contextText = `Category: ${category}\nTitle: ${title}`;
    }

    const prompt = `
    Role: You are an expert copywriter for B2B cold outreach in Slovakia.
    Language: SLOVAK (Slovenský jazyk) ONLY.
    Tone: Spartan, Laconic, Conversational (Stručný, priamy, bez 'omáčok').
    
    Target Business: "${businessName}"
    Category: "${category}"
    Context INFO (Scraped text):
    ${contextText}
    
    Your Task: Write a short personalized opener consisting of TWO SENTENCES.
    
    CRITICAL RULES:
    1. Start EXACTLY with: "Dobrý deň. Páči sa mi, že v ${businessName}..."
    2. SPECIFICITY IS KEY: 
       - NEVER use generic words like "montáž" or "predaj" alone. ALWAYS specify WHAT (e.g. "montáž plynových kotlov", "predaj dubových parkiet").
       - From the context, find the specific niche (e.g. don't say "heating", say "industrial heat pumps").
       - The text MUST clearly identify the industry even if I hide the company name.
    
    3. STRUCTURE (2 Sentences):
       - Sentence 1: "Dobrý deň. Páči sa mi, že v ${businessName} [specific core activity]."
       - Sentence 2: "[Mention a specific detail, project, technique or specialization found on the site]."
    
    4. VOCALIZATION (CRITICAL): 
       - Write naturally, as if speaking to a friend. 
       - Avoid "corporate robot" language. Use human language.
    
    5. Backup Strategy: If (and ONLY if) Context INFO is empty/useless, say: "Dobrý deň. Páči sa mi, že v ${businessName} pôsobíte v sektore ${category || 'vášho podnikania'}."
    
    Output ONLY the text. No quotes.
    `;

    try {
        // Updated to Gemini 3.0 Flash (Latest 2026 Model)
        const model = genAI.getGenerativeModel({ model: "gemini-3.0-flash" });
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const sentence = response.text().trim();
        
        return {
            name: businessName,
            sentence: sentence ? sentence.replace(/^"|"$/g, "") : null
        };

    } catch (e) {
        console.error("AI Gen Error:", e);
        // Fallback or retry logic could go here
        return null;
    }
}
