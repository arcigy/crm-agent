
const decodeEntities = (html) => {
    return html.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
               .replace(/&[a-z]+;/gi, (match) => {
                   const entities = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#039;': "'", '&nbsp;': ' ' };
                   return entities[match] || match;
               });
};

const extractEmails = (input) => {
    const found = new Set();
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,10}/g;
    const matches = input.match(emailRegex) || [];
    matches.forEach(m => found.add(m.toLowerCase()));
    
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

async function fetchAndAnalyze(targetUrl) {
    try {
        console.log(`[Scraper] Fetching: ${targetUrl}`);
        const res = await fetch(targetUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                "Accept-Language": "sk-SK,sk;q=0.9,cs;q=0.8,en-US;q=0.7,en;q=0.6",
                "Cache-Control": "no-cache"
            },
            redirect: "follow"
        });

        console.log(`[Scraper] Status: ${res.status} ${res.statusText}`);
        
        const rawHtml = await res.text();
        console.log(`[Scraper] Length: ${rawHtml.length} bytes`);
        if (targetUrl === "https://www.plynoservishe.sk/") {
            console.log("--- HTML DUMP (first 1000) ---");
            console.log(rawHtml.slice(0, 1000));
        }

        const html = decodeEntities(rawHtml);
        const emails = new Set(extractEmails(html));

        // SCAN SCRIPTS (For SPAs based on React/Vite)
        const scriptRegex = /<script\b[^>]*src=["']([^"']+)["']/gi;
        let scriptMatch;
        const scripts = [];
        while ((scriptMatch = scriptRegex.exec(html)) !== null) {
            scripts.push(scriptMatch[1]);
        }

        for (const scriptSrc of scripts) {
            try {
                const scriptUrl = new URL(scriptSrc, targetUrl).toString();
                if (scriptUrl.includes(new URL(targetUrl).hostname) || scriptSrc.startsWith("/")) {
                    console.log(`[Scraper] Scanning Script: ${scriptUrl}`);
                    const sRes = await fetch(scriptUrl);
                    if (sRes.ok) {
                        const sText = await sRes.text();
                        const sEmails = extractEmails(sText);
                        sEmails.forEach(e => emails.add(e));
                    }
                }
            } catch(e) {}
        }

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
        
        return { html, emails: [...new Set(emails)] };
    } catch (e) {
        console.error(`[Scraper] Error ${targetUrl}:`, e.message);
        return null;
    }
}

async function testUrl(url) {
    console.log(`\n--- TESTING: ${url} ---`);
    const home = await fetchAndAnalyze(url);
    if (!home) return;

    console.log(`Emails found on homepage: ${home.emails.join(", ") || "NONE"}`);

    if (home.emails.length === 0) {
        console.log("No emails on home, searching for contact page...");
        const linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/gi;
        let match;
        const queue = [];
        while ((match = linkRegex.exec(home.html)) !== null) {
            const link = match[2];
            if (!link || link.startsWith("#") || link.startsWith("tel:") || link.startsWith("javascript:")) continue;
            try {
                const absUrl = new URL(link, url).toString().split("#")[0];
                if (absUrl.startsWith(url) || absUrl.includes(new URL(url).hostname)) {
                    queue.push(absUrl);
                }
            } catch(e) {}
        }

        const sorted = queue.sort((a,b) => {
            const score = (l) => l.toLowerCase().includes("kontakt") || l.toLowerCase().includes("contact") ? 1 : 0;
            return score(b) - score(a);
        });

        const toCrawl = [...new Set(sorted)].slice(0, 5);
        for (const subUrl of toCrawl) {
            const sub = await fetchAndAnalyze(subUrl);
            if (sub && sub.emails.length > 0) {
                console.log(`FOUND EMAILS on ${subUrl}: ${sub.emails.join(", ")}`);
                return;
            }
        }
    }
}

async function runTests() {
    await testUrl("https://plynarbratislava.sk/");
    await testUrl("https://www.plynoservishe.sk/");
    console.log("\n--- BLIND ATTEMPT FOR HUMENNE ---");
    await testUrl("https://www.plynoservishe.sk/kontakt/");
}

runTests();
