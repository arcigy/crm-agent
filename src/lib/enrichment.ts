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
export async function scrapeWebsite(url: string): Promise<{ text: string, email?: string } | null> {
    if (!url) return null;
    
    // Helper to fetch and clean text, and extract emails
    const fetchAndAnalyze = async (targetUrl: string): Promise<{ text: string, html: string, emails: string[] } | null> => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout per page is safer for email hunting

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
            
            // Extract Emails BEFORE cleaning text (from raw HTML to catch mailto: and hidden in tags)
            const emailRegex = /[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}/g;
            const foundEmails = html.match(emailRegex) || [];
            // Basic deduplication and filtering of clearly garbage emails (like example.com or image extensions)
            const validEmails = [...new Set(foundEmails)].filter(e => {
                const lower = e.toLowerCase();
                return !lower.endsWith(".png") && !lower.endsWith(".jpg") && !lower.endsWith(".gif") && !lower.endsWith(".js") && !lower.includes("example.com") && !lower.includes("domain.com");
            });

            // Basic HTML to Text Conversion
            text = text.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "");
            text = text.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, "");
            text = text.replace(/<head\b[^>]*>([\s\S]*?)<\/head>/gim, "");
            text = text.replace(/<!--[\s\S]*?-->/g, "");
            text = text.replace(/<\/div>|<\/p>|<\/li>|<\/h[1-6]>/gim, "\n");
            text = text.replace(/<br\s*\/?>/gim, "\n");
            text = text.replace(/<[^>]+>/g, " ");
            text = text.replace(/\s+/g, " ").trim();
            
            return { text, html, emails: validEmails };
        } catch (e) {
            console.error(`Scrape Error (${targetUrl}):`, e);
            return null;
        }
    };

    try {
        // 1. Fetch Homepage
        const home = await fetchAndAnalyze(url);
        if (!home) return null;

        let combinedText = `--- HOMEPAGE ---\n${home.text}`;
        let collectedEmails = [...home.emails];

        // 2. Extract and Filter Links
        const linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/gi;
        let match;
        const subLinks = new Set<string>();
        
        while ((match = linkRegex.exec(home.html)) !== null) {
            let link = match[2];
            if (!link || link.startsWith("#") || link.startsWith("javascript:") || link.startsWith("tel:")) continue;
            
            try {
                const absUrl = new URL(link, url).toString();
                // Stay on same domain
                if (absUrl.startsWith(url) || absUrl.includes(new URL(url).hostname)) {
                    subLinks.add(absUrl);
                }
            } catch(e) { /* ignore */ }
        }

        // 3. Prioritize Links (Contact, About, Info)
        const priorityKeywords = ["kontakt", "contact", "spojte", "about", "o-nas", "sluzby", "services", "produkty", "products", "info", "impressum"];
        const candidates = Array.from(subLinks).filter(l => l !== url);
        
        const sortedCandidates = candidates.sort((a, b) => {
            const score = (link: string) => {
                let s = 0;
                const lower = link.toLowerCase();
                if (lower.includes("kontakt") || lower.includes("contact")) s += 10;
                if (lower.includes("o-nas") || lower.includes("about")) s += 5;
                if (lower.includes("sluzby") || lower.includes("services")) s += 3;
                return s;
            };
            return score(b) - score(a);
        });

        // 4. Crawl up to 10 top candidates
        const toCrawl = sortedCandidates.slice(0, 10);
        
        for (const subUrl of toCrawl) {
            try {
                const sub = await fetchAndAnalyze(subUrl);
                if (sub) {
                    if (sub.text.length > 50) {
                        combinedText += `\n\n--- SUBPAGE (${new URL(subUrl).pathname}) ---\n${sub.text}`;
                    }
                    collectedEmails = [...collectedEmails, ...sub.emails];
                }
            } catch (e) { /* ignore page fail */ }
        }

        // 5. Deduplicate and Prioritize Emails
        const uniqueEmails = [...new Set(collectedEmails)];
        // Filter out obviously wrong ones
        const filteredEmails = uniqueEmails.filter(e => {
            const lower = e.toLowerCase();
            return !lower.includes("wix.com") && !lower.includes("sentry.io") && !lower.includes("example.com") && !lower.includes("domain.com");
        });

        const prioritizedEmail = filteredEmails.find(e => 
            e.includes("info@") || 
            e.includes("kontakt@") || 
            e.includes("office@") || 
            e.includes("predaj@") ||
            e.includes("servis@") ||
            e.includes("obchod@") ||
            e.includes("dopyt@")
        ) || filteredEmails[0];

        return {
            text: combinedText,
            email: prioritizedEmail || undefined
        };

    } catch (e) {
        console.error("Master Scrape Error:", e);
        return null; 
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
        console.log(`[AI] Requesting Gemini 3 Flash for: ${businessName}`);
        
        // As requested: Using Gemini 3 Flash (Latest 2026 Model)
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        
        if (!response) throw new Error("No response from Gemini API");
        
        const textResponse = response.text();
        if (!textResponse) throw new Error("Empty response from Gemini API");

        const sentence = textResponse.trim();
        
        console.log(`[AI] Successfully generated for ${businessName}`);

        return {
            name: businessName,
            sentence: sentence.replace(/^["']|["']$/g, ""),
            error: null
        };

    } catch (e: any) {
        const msg = e.message || String(e);
        console.error(`[AI] ERROR for ${businessName}:`, msg);
        return {
            name: businessName,
            sentence: null,
            error: msg
        };
    }
}
