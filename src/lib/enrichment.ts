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

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY || "";

// 1. Custom Website Scraper (With Firecrawl Fallback)
export async function scrapeWebsite(url: string): Promise<{ text: string, email?: string } | null> {
    if (!url) return null;
    
    // Helper to fetch and clean text, and extract emails
    const fetchAndAnalyze = async (targetUrl: string): Promise<{ text: string, html: string, emails: string[] } | null> => {
        try {
            console.log(`[Scraper] Stage 1 (Fetch): ${targetUrl}`);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 12000); 

            const res = await fetch(targetUrl, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                    "Accept-Language": "sk,cs;q=0.9,en;q=0.8",
                    "Cache-Control": "no-cache"
                },
                redirect: "follow", 
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!res.ok) return null;
            
            const html = await res.text();
            
            const foundEmails = new Set<string>();
            const emailRegex = /[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}/g;
            const matches = html.match(emailRegex) || [];
            matches.forEach(e => foundEmails.add(e));

            const mailtoRegex = /mailto:([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6})/gi;
            let m;
            while ((m = mailtoRegex.exec(html)) !== null) {
                foundEmails.add(m[1]);
            }

            if (html.includes("data-cfemail")) {
                const cfRegex = /data-cfemail="([^"]+)"/g;
                let cfMatch;
                while ((cfMatch = cfRegex.exec(html)) !== null) {
                    try {
                        const encoded = cfMatch[1];
                        let r = parseInt(encoded.substr(0, 2), 16), n = "", e = 2;
                        for (; encoded.length - e; e += 2) {
                            n += String.fromCharCode(parseInt(encoded.substr(e, 2), 16) ^ r);
                        }
                        if (n.includes("@")) foundEmails.add(n);
                    } catch(err) { /* ignore */ }
                }
            }

            const validEmails = Array.from(foundEmails).filter(e => {
                const lower = e.toLowerCase();
                return !lower.endsWith(".png") && !lower.endsWith(".jpg") && !lower.endsWith(".gif") && !lower.endsWith(".js") && !lower.includes("example.com") && !lower.includes("wix.com");
            });

            let text = html;
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

    const scrapeWithFirecrawl = async (targetUrl: string) => {
        if (!FIRECRAWL_API_KEY) return null;
        try {
            console.log(`[Scraper] Stage 2 (Firecrawl - JS Rendering): ${targetUrl}`);
            const response = await fetch("https://api.firecrawl.dev/v0/scrape", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${FIRECRAWL_API_KEY}`
                },
                body: JSON.stringify({
                    url: targetUrl,
                    pageOptions: {
                        onlyMainContent: false,
                        waitFor: 3000 // Wait for JS/Footer to load
                    }
                })
            });

            if (!response.ok) return null;
            const data = await response.json();
            
            if (data.success && data.data) {
                const content = data.data.content || "";
                const html = data.data.html || "";
                
                // Extract emails from whatever Firecrawl returned
                const combined = content + " " + html;
                const emailRegex = /[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}/g;
                const found = combined.match(emailRegex) || [];
                return {
                    text: content,
                    emails: [...new Set(found)]
                };
            }
            return null;
        } catch (e) {
            console.error("Firecrawl Error:", e);
            return null;
        }
    };

    try {
        // 1. Fetch Homepage (Local)
        const home = await fetchAndAnalyze(url);
        if (!home) return null;

        let combinedText = `--- HOMEPAGE ---\n${home.text}`;
        let collectedEmails = [...home.emails];

        // 2. Extract and Filter Links
        const linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/gi;
        let match;
        const subLinks = new Set<string>();
        
        while ((match = linkRegex.exec(home.html)) !== null) {
            const link = match[2];
            if (!link || link.startsWith("#") || link.startsWith("javascript:") || link.startsWith("tel:")) continue;
            
            try {
                const absUrl = new URL(link, url).toString();
                if (absUrl.startsWith(url) || absUrl.includes(new URL(url).hostname)) {
                    subLinks.add(absUrl);
                }
            } catch(e) { }
        }

        const candidates = Array.from(subLinks).filter(l => l !== url);
        const sortedCandidates = candidates.sort((a, b) => {
            const score = (link: string) => {
                const lower = link.toLowerCase();
                if (lower.includes("kontakt") || lower.includes("contact")) return 10;
                if (lower.includes("o-nas") || lower.includes("about")) return 5;
                return 0;
            };
            return score(b) - score(a);
        });

        const toCrawl = sortedCandidates.slice(0, 3);
        for (const subUrl of toCrawl) {
            const sub = await fetchAndAnalyze(subUrl);
            if (sub) {
                if (sub.text.length > 50) combinedText += `\n\n--- SUBPAGE ---\n${sub.text}`;
                collectedEmails = [...collectedEmails, ...sub.emails];
            }
        }

        // --- FALLBACK TO FIRECRAWL ---
        // If we have no emails after local scraping, use the pro artillery
        if (collectedEmails.length === 0 && FIRECRAWL_API_KEY) {
            const fireResult = await scrapeWithFirecrawl(url);
            if (fireResult) {
                collectedEmails = [...fireResult.emails];
                if (fireResult.text.length > 100) {
                     combinedText += `\n\n--- FIRECRAWL CONTENT ---\n${fireResult.text}`;
                }
            }
        }

        const uniqueEmails = [...new Set(collectedEmails)];
        const filteredEmails = uniqueEmails.filter(e => {
            const lower = e.toLowerCase();
            return !lower.includes("wix.com") && !lower.includes("sentry.io") && !lower.includes("example.com") && !lower.includes("domain.com");
        });

        const prioritizedEmail = filteredEmails.find(e => 
            e.includes("info@") || e.includes("kontakt@") || e.includes("office@") || 
            e.includes("predaj@") || e.includes("servis@") || e.includes("obchod@")
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
