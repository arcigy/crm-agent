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
export async function scrapeWebsite(url: string): Promise<string | null> {
    if (!url) return null;
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const res = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            },
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!res.ok) return null;
        
        const html = await res.text();
        
        // Basic HTML to Text Conversion
        let text = html;
        
        // Remove scripts, styles, head, comments
        text = text.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "");
        text = text.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, "");
        text = text.replace(/<head\b[^>]*>([\s\S]*?)<\/head>/gim, "");
        text = text.replace(/<!--[\s\S]*?-->/g, "");
        
        // Replace block tags with newlines
        text = text.replace(/<\/div>|<\/p>|<\/li>|<\/h[1-6]>/gim, "\n");
        text = text.replace(/<br\s*\/?>/gim, "\n");
        
        // Strip remaining tags
        text = text.replace(/<[^>]+>/g, " ");
        
        // Collapse whitespace
        text = text.replace(/\s+/g, " ").trim();
        
        return text;
    } catch (e) {
        console.error("Custom Scrape Error:", e);
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
    
    Your Task: Write a ONE-SENTENCE personalized icebreaker.
    
    CRITICAL RULES:
    1. Start EXACTLY with: "Dobrý deň. Páči sa mi, že v ${businessName}..."
    2. SHORTEN NAMES & LOCATIONS: 
       - Use "Datacomp" instead of "Datacomp s.r.o.". 
       - Use simple city names (e.g. "v Bratislave" instead of "v Bratislavskom kraji").
    3. DEEP DIVE (The "I creeped you" effect): 
       - Focus on small, non-obvious specific details to prove we read their site.
       - BAD: "sa venujete stavebníctvu." (Obvious)
       - GOOD: "sa pri výstavbe domov sústredíte na nízkoenergetické drevostavby." (Specific)
    4. NO FLUFF: Do not use "kvalitné služby", "komplexné riešenia", "dlhoročné skúsenosti" or "profesionálny prístup". Save the reader's time.
    5. VOCALIZATION (CRITICAL): 
       - Write naturally, as if speaking to a friend. 
       - It is OK to break strict grammar rules if it sounds more natural.
       - Avoid "corporate robot" language. Use human language.
       - Example tone: "Love that you guys are focusing on X..." -> "Páči sa mi, že sa zameriavate na X..."
    
    6. Backup Strategy: If (and ONLY if) Context INFO is empty/useless, say: "Dobrý deň. Páči sa mi, že v ${businessName} pôsobíte v sektore ${category || 'vášho podnikania'}."
    
    Output ONLY the single sentence. No quotes.
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
