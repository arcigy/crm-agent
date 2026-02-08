import { ColdLeadItem } from "@/app/actions/cold-leads";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dns from "dns";
import net from "net";
import { promisify } from "util";

const resolveMx = promisify(dns.resolveMx);

// Helper: Stealth SMTP Recipient Check (without sending)
async function verifyEmailRecipient(email: string, mxHost: string): Promise<boolean> {
    return new Promise((resolve) => {
        const socket = net.createConnection(25, mxHost);
        let step = 0;
        socket.setTimeout(4000);

        socket.on('data', (data) => {
            const response = data.toString();
            // 220 = Server ready
            if (step === 0 && response.startsWith('220')) {
                socket.write(`HELO crm-agent.io\r\n`);
                step++;
            } 
            // 250 = OK
            else if (step === 1 && response.startsWith('250')) {
                socket.write(`MAIL FROM:<verify@crm-agent.io>\r\n`);
                step++;
            } 
            else if (step === 2 && response.startsWith('250')) {
                socket.write(`RCPT TO:<${email}>\r\n`);
                step++;
            } 
            // Final check response (250 = User exists, 550 = No such user)
            else if (step === 3) {
                if (response.startsWith('250')) resolve(true);
                else resolve(false);
                socket.write('QUIT\r\n');
                socket.end();
            }
        });

        socket.on('error', () => resolve(false));
        socket.on('timeout', () => { socket.destroy(); resolve(false); });
    });
}

// Helper: Guess and VERIFY common emails if none found
async function guessEmailsForDomain(url: string): Promise<string[]> {
    try {
        const domain = new URL(url).hostname.replace("www.", "");
        // 1. Check if domain has MX records
        const mxRecords = await resolveMx(domain).catch(() => []);
        if (mxRecords.length === 0) return [];

        const bestMx = mxRecords.sort((a,b) => a.priority - b.priority)[0].exchange;
        const prefixes = ["info", "kontakt", "office", "servis", "obchod", "predaj"];
        
        // 2. Try to verify the first few (parallel)
        const candidates = prefixes.map(p => `${p}@${domain}`);
        const results = await Promise.all(
            candidates.slice(0, 3).map(async (email) => {
                const isValid = await verifyEmailRecipient(email, bestMx);
                return isValid ? email : null;
            })
        );

        const found = results.filter((e): e is string => e !== null);
        
        // Final fallback: if SMTP check was blocked/failed but MX is fine, 
        // return at least 'info' to keep things working
        return found.length > 0 ? found : [`info@${domain}`];
    } catch {
        return [];
    }
}

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
        
        const generics = ["gmail", "outlook", "yahoo", "zoznam", "azet", "centrum", "facebook", "instagram", "linkedin", "google", "envidom", "websupport"];
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
export async function scrapeWebsite(rawUrl: string): Promise<{ text: string, email?: string } | null> {
    if (!rawUrl) return null;
    
    // 0. Normalize URL (Ensure protocol exists)
    let url = rawUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = `https://${url}`;
    }

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
            // NIGHT MODE: 90 seconds global timeout (plenty of time for deep scan)
            const timeoutId = setTimeout(() => controller.abort(), 90000); 

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
            
            // 1. Extractions
            const emails = new Set(extractEmails(html));

            // --- DEEP SCAN: Recursive Script Analysis (SPA Support) ---
            const scriptRegex = /<script\b[^>]*src=["']([^"']+)["']/gi;
            let scriptMatch;
            const scriptQueue: string[] = [];
            const scannedScripts = new Set<string>();
            
            // Initial scripts
            while ((scriptMatch = scriptRegex.exec(html)) !== null) {
                scriptQueue.push(scriptMatch[1]);
            }

            // NIGHT MODE SETTINGS:
            const MAX_SCRIPTS = 50; // Scan deeply up to 50 chunks
            let scriptsScanned = 0;
            const startTime = Date.now();

            // Ignore common vendor/tracking scripts to save time
            const isIgnoredScript = (src: string) => {
                const s = src.toLowerCase();
                return s.includes("jquery") || s.includes("google") || s.includes("facebook") || 
                       s.includes("analytics") || s.includes("gtm") || s.includes("wp-includes") || 
                       s.includes("wp-content/plugins") || s.includes("fontawesome") || s.includes("bootstrap");
            };

            // Process loop
            while (scriptQueue.length > 0 && scriptsScanned < MAX_SCRIPTS) {
                // Time Check: Allow up to 45 seconds for deep scan (was 8s)
                if (Date.now() - startTime > 45000) break;

                // Take batch of 5 scripts to fetch in parallel
                const batch = scriptQueue.splice(0, 5);
                
                const processScript = async (currentSrc: string) => {
                    if (!currentSrc || scriptsScanned >= MAX_SCRIPTS) return;
                    
                    try {
                        const scriptUrl = new URL(currentSrc, targetUrl).toString();

                        if (scannedScripts.has(scriptUrl) || isIgnoredScript(scriptUrl) ||
                           (!scriptUrl.includes(new URL(targetUrl).hostname) && !currentSrc.startsWith("/"))) {
                            return;
                        }

                        scannedScripts.add(scriptUrl);
                        scriptsScanned++;

                        const sController = new AbortController();
                        const sTimeout = setTimeout(() => sController.abort(), 10000); // 10s per script (was 2s)
                        
                        const sRes = await fetch(scriptUrl, { signal: sController.signal });
                        clearTimeout(sTimeout);

                        if (sRes.ok) {
                            const sText = await sRes.text();
                            
                            // A. Extract Emails
                            extractEmails(sText).forEach(e => emails.add(e));

                            // B. Find imports
                            const importRegex = /(?:from\s*|import\s*\(\s*)["'](\.[^"']+)["']/g;
                            let importMatch;
                            while ((importMatch = importRegex.exec(sText)) !== null) {
                                try {
                                    const relativeImport = importMatch[1];
                                    const resolvedImport = new URL(relativeImport, scriptUrl).toString();
                                    if (!scannedScripts.has(resolvedImport)) {
                                        scriptQueue.push(resolvedImport);
                                    }
                                } catch(e) {}
                            }
                        }
                    } catch (e) { /* ignore */ }
                };

                await Promise.all(batch.map(src => processScript(src)));
            }

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
                        if (n.includes("@")) emails.add(n.toLowerCase());
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
            
            return { text, html, emails: Array.from(emails) };
        } catch (e) {
            return null;
        }
    };

    try {
        let home = await fetchAndAnalyze(url);
        
        // --- RETRY: If HTTPS fails, try HTTP ---
        if (!home && url.startsWith("https://")) {
            console.warn(`[Scraper] HTTPS failed for ${url}, trying HTTP...`);
            const httpUrl = url.replace("https://", "http://");
            home = await fetchAndAnalyze(httpUrl);
            if (home) url = httpUrl; // Update base URL for relative links
        }

        // --- RESILIENCE: If home fails (403/Blocked), try guessing immediately ---
        if (!home) {
            console.warn(`[Scraper] Failed to access ${url} even with fallback.`);
            const guessed = await guessEmailsForDomain(url);
            if (guessed.length > 0) {
                return { text: "", email: guessed[0] };
            }
            return null;
        }

        let combinedText = `--- HOMEPAGE ---\n${home.text}`;
        const collectedEmails = new Set<string>(home.emails);
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
                sub.emails.forEach(e => collectedEmails.add(e));
            }
        }

        // --- FINAL FALLBACK: GUESSING ---
        if (collectedEmails.size === 0) {
            const guessed = await guessEmailsForDomain(url);
            guessed.forEach(e => collectedEmails.add(e));
        }

        const currentDomain = new URL(url).hostname.replace("www.", "").toLowerCase();

        const filteredEmails = Array.from(collectedEmails).filter(e => {
            const l = e.toLowerCase();
            return !l.includes("wix.com") && !l.includes("sentry.io") && !l.includes("example.com") && !l.includes("domain.com") && !l.includes("envidom.sk");
        });

        // --- SORTING LOGIC ---
        // 1. Domain matches (plynko.sk emails first on plynko.sk)
        // 2. Prefixes (info, kontakt, etc.)
        const emailScore = (email: string) => {
            let score = 0;
            const l = email.toLowerCase();
            
            // Priority 1: Domain match (Very High)
            if (l.endsWith(`@${currentDomain}`)) score += 1000;
            
            // Priority 2: Good prefixes
            if (l.startsWith("info@")) score += 100;
            if (l.startsWith("kontakt@") || l.startsWith("contact@")) score += 90;
            if (l.startsWith("office@")) score += 80;
            if (l.startsWith("predaj@") || l.startsWith("obchod@")) score += 70;
            if (l.startsWith("servis@")) score += 60;
            
            return score;
        };

        const topEmail = filteredEmails.sort((a, b) => emailScore(b) - emailScore(a))[0];

        return {
            text: combinedText,
            email: topEmail || undefined
        };

    } catch {
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
        contextText = `Website/Source Content:\n${scrapedContent.slice(0, 15000)}`;  // Increased token limit for scanning names
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
    Tone: Professional yet Conversational (Stručný, priamy, bez 'omáčok').
    
    Target Business: "${businessName}"
    Category: "${category}"
    Context INFO (Scraped text):
    ${contextText}
    
    Your Task:
    1. Scan the text for specific Decision Makers (CEO, Majiteľ, Konateľ, Riaditeľ).
       - Look for names like "Ján Novák", "Ing. Peter Kováč".
       - Prioritize hierarchy: Majiteľ/CEO/Konateľ > Riaditeľ > Manažér.
       - Do NOT invent names. Only use what is explicitly in the text.
    
    2. Write a short personalized opener (TWO SENTENCES).
    
    CRITICAL RULES:
    1. SALUTATION MODE (MANDATORY COMMA):
       - IF you found a decision maker's name (e.g. Peter Novák), start EXACTLY with:
         "Dobrý deň, pán Novák," (Use Last Name properly inflected if possible, or just Nominative if unsure, but standard Slovak formal address is "Dobrý deň, pán [Priezvisko]").
         (Note: If the person is female, use "Dobrý deň, pani [Priezvisko],").
       - IF NO name found, start EXACTLY with:
         "Dobrý deň,"
       - ALWAYS put a comma at the end of the salutation.

    2. CONTENT SPECIFICITY: 
       - NEVER use generic words like "montáž" or "predaj" alone. ALWAYS specify WHAT (e.g. "montáž plynových kotlov", "predaj dubových parkiet").
       - From the context, find the specific niche.
       - The text MUST clearly identify the industry even if I hide the company name.
    
    3. STRUCTURE (2 Sentences):
       - Salutation: "Dobrý deň, [Meno],"
       - Sentence 1: "Páči sa mi, že v ${businessName} [specific core activity]."
       - Sentence 2: "[Mention a specific detail, project, technique or specialization found on the site]."
    
    4. VOCALIZATION (CRITICAL): 
       - Write naturally, as if speaking to a friend. 
       - Avoid "corporate robot" language. Use human language.
    
    5. Backup Strategy: If (and ONLY if) Context INFO is empty/useless, say: "Dobrý deň, Páči sa mi, že v ${businessName} pôsobíte v sektore ${category || 'vášho podnikania'}."
    
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

        let sentence = textResponse.trim().replace(/^["']|["']$/g, "");
        
        // Format for Email: 
        // Logic: Identify "Dobrý deň" + optional name part (MUST start with pán/pani) + trailing comma.
        // This prevents capturing "Páči sa mi" as a name if it's followed by a comma.
        sentence = sentence.replace(/^(Dobrý deň,(?:\s*(?:pán|pani)\s+[^,]+)?),\s*/i, '$1,\n\n');

        console.log(`[AI] Successfully generated for ${businessName}`);

        return {
            name: businessName,
            sentence: sentence,
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
