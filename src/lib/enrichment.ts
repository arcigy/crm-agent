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

// 1. Custom Website Scraper (Pure Internal Logic)
export async function scrapeWebsite(url: string): Promise<{ text: string, email?: string } | null> {
    if (!url) return null;
    
    // Helper: Decode HTML Entities (Catch &#64; etc.)
    const decodeEntities = (html: string) => {
        return html.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
                   .replace(/&[a-z]+;/gi, (match) => {
                       const entities: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#039;': "'", '&nbsp;': ' ' };
                       return entities[match] || match;
                   });
    };

    // Helper: Extract Emails from ANY string
    const extractEmails = (input: string) => {
        const found = new Set<string>();
        // Standard Regex
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,10}/g;
        const matches = input.match(emailRegex) || [];
        matches.forEach(m => found.add(m.toLowerCase()));
        
        // Mailto Regex
        const mailtoRegex = /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,10})/gi;
        let m;
        while ((m = mailtoRegex.exec(input)) !== null) {
            found.add(m[1].toLowerCase());
        }
        
        return Array.from(found).filter(e => {
            const l = e.toLowerCase();
            return !l.includes("wix.com") && !l.includes("sentry.io") && !l.includes("example.com") && 
                   !l.includes(".png") && !l.includes(".jpg") && !l.includes(".js") && !l.includes(".gif");
        });
    };

    const fetchAndAnalyze = async (targetUrl: string): Promise<{ text: string, html: string, emails: string[] } | null> => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); 

            const res = await fetch(targetUrl, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                    "Accept-Language": "sk-SK,sk;q=0.9,cs;q=0.8,en-US;q=0.7,en;q=0.6",
                    "Cache-Control": "no-cache",
                    "Pragma": "no-cache",
                    "Sec-Fetch-Dest": "document",
                    "Sec-Fetch-Mode": "navigate",
                    "Sec-Fetch-Site": "none",
                    "Upgrade-Insecure-Requests": "1"
                },
                redirect: "follow",
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!res.ok) return null;
            const rawHtml = await res.text();
            const html = decodeEntities(rawHtml);
            
            // 1. Emails from raw HTML (catches attributes, comments, scripts)
            const emails = extractEmails(html);

            // 2. Cloudflare de-obfuscation
            if (html.includes("data-cfemail")) {
                const cfMatches = html.match(/data-cfemail="([^"]+)"/g) || [];
                cfMatches.forEach(cfm => {
                    try {
                        const encoded = cfm.split('"')[1];
                        let r = parseInt(encoded.substr(0, 2), 16), n = "", e = 2;
                        for (; encoded.length - e; e += 2) {
                            n += String.fromCharCode(parseInt(encoded.substr(e, 2), 16) ^ r);
                        }
                        if (n.includes("@")) emails.push(n.toLowerCase());
                    } catch(err) {}
                });
            }

            // 3. Clean text for AI
            let text = html;
            text = text.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "");
            text = text.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, "");
            text = text.replace(/<head\b[^>]*>([\s\S]*?)<\/head>/gim, "");
            text = text.replace(/<!--[\s\S]*?-->/g, "");
            text = text.replace(/<\/div>|<\/p>|<\/li>|<\/h[1-6]>/gim, "\n");
            text = text.replace(/<[^>]+>/g, " ");
            text = text.replace(/\s+/g, " ").trim();
            
            return { text, html, emails: [...new Set(emails)] };
        } catch (e) {
            return null;
        }
    };

    try {
        const home = await fetchAndAnalyze(url);
        if (!home) return null;

        let combinedText = `--- HOMEPAGE ---\n${home.text}`;
        let collectedEmails = [...home.emails];
        const visited = new Set<string>([url]);

        // 2. Extract ALL Links
        const linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/gi;
        let match;
        const queue: string[] = [];
        
        while ((match = linkRegex.exec(home.html)) !== null) {
            try {
                const link = match[2];
                if (!link || link.startsWith("#") || link.startsWith("javascript:") || link.startsWith("tel:")) continue;
                const absUrl = new URL(link, url).toString().split("#")[0];
                if ((absUrl.startsWith(url) || absUrl.includes(new URL(url).hostname)) && !visited.has(absUrl)) {
                    queue.push(absUrl);
                    visited.add(absUrl);
                }
            } catch(e) {}
        }

        // 3. Smart Sorting (Contact pages first)
        const sortedQueue = queue.sort((a, b) => {
            const score = (l: string) => {
                const low = l.toLowerCase();
                if (low.includes("kontakt") || low.includes("contact")) return 10;
                if (low.includes("o-nas") || low.includes("about") || low.includes("firma")) return 5;
                if (low.includes("sluzby") || low.includes("servis") || low.includes("produkty")) return 3;
                return 0;
            };
            return score(b) - score(a);
        });

        // 4. DEEP SCRAPE (Visit up to 15 pages)
        const toCrawl = sortedQueue.slice(0, 15);
        for (const subUrl of toCrawl) {
            const sub = await fetchAndAnalyze(subUrl);
            if (sub) {
                if (sub.text.length > 50) combinedText += `\n\n--- SUBPAGE (${new URL(subUrl).pathname}) ---\n${sub.text}`;
                collectedEmails = [...collectedEmails, ...sub.emails];
            }
        }

        const filteredEmails = [...new Set(collectedEmails)].filter(e => {
            const l = e.toLowerCase();
            return !l.includes("wix.com") && !l.includes("sentry.io") && !l.includes("example.com") && !l.includes("domain.com");
        });

        const prioritizedEmail = filteredEmails.find(e => 
            e.includes("info@") || e.includes("kontakt@") || e.includes("office@") || 
            e.includes("servis@") || e.includes("obchod@") || e.includes("predaj@")
        ) || filteredEmails[0];

        return {
            text: combinedText,
            email: prioritizedEmail || undefined
        };

    } catch (e) {
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
