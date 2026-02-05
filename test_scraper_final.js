
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
        const res = await fetch(targetUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                "Accept-Language": "sk-SK,sk;q=0.9,cs;q=0.8,en-US;q=0.7,en;q=0.6"
            },
            redirect: "follow"
        });

        if (!res.ok) return null;
        
        const rawHtml = await res.text();
        const html = decodeEntities(rawHtml);
        const emails = new Set(extractEmails(html));

        // Scan scripts
        const scriptRegex = /<script\b[^>]*src=["']([^"']+)["']/gi;
        let scriptMatch;
        while ((scriptMatch = scriptRegex.exec(html)) !== null) {
            try {
                const scriptUrl = new URL(scriptMatch[1], targetUrl).toString();
                if (scriptUrl.includes(new URL(targetUrl).hostname) || scriptMatch[1].startsWith("/")) {
                    const sRes = await fetch(scriptUrl);
                    if (sRes.ok) {
                        const sText = await sRes.text();
                        extractEmails(sText).forEach(e => emails.add(e));
                    }
                }
            } catch(e) {}
        }

        return { html, emails: Array.from(emails) };
    } catch (e) {
        return null;
    }
}

const dns = require("dns");
const { promisify } = require("util");
const resolveMx = promisify(dns.resolveMx);

async function guessEmails(url) {
    try {
        const domain = new URL(url).hostname.replace("www.", "");
        const mx = await resolveMx(domain).catch(() => []);
        if (mx.length === 0) return [];
        return ["info", "kontakt"].map(p => `${p}@${domain}`);
    } catch { return []; }
}

async function runTest(url) {
    process.stdout.write(`Testing ${url} ... `);
    let home = await fetchAndAnalyze(url);
    
    if (home && home.emails.length > 0) {
        console.log(`✅ ${home.emails[0]}`);
        return true;
    }

    if (home) {
        const linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/gi;
        let match;
        const queue = [];
        while ((match = linkRegex.exec(home.html)) !== null) {
            const link = match[2];
            if (!link || link.startsWith("#") || link.startsWith("tel:")) continue;
            try {
                const absUrl = new URL(link, url).toString().split("#")[0];
                if (absUrl.startsWith(url) || absUrl.includes(new URL(url).hostname)) {
                    queue.push(absUrl);
                }
            } catch(e) {}
        }
        
        const sorted = queue.sort((a,b) => {
            const score = (l) => l.toLowerCase().includes("kontakt") ? 1 : 0;
            return score(b) - score(a);
        });

        const toCrawl = [...new Set(sorted)].slice(0, 5);
        for (const subUrl of toCrawl) {
            const sub = await fetchAndAnalyze(subUrl);
            if (sub && sub.emails.length > 0) {
                console.log(`✅ ${sub.emails[0]} (on ${subUrl})`);
                return true;
            }
        }
    }

    // LAST RESORT: Guessing
    const guessed = await guessEmails(url);
    if (guessed.length > 0) {
        console.log(`💡 GUESSED: ${guessed[0]}`);
        return true;
    }

    console.log("❌ FAILED");
    return false;
}

async function main() {
    const urls = [
        "https://www.priemyselnepodlahypresov.sk/",
        "http://www.lagro-podlahy.eu/",
        "https://www.premiumfloors.sk/"
    ];

    let success = 0;
    for (const url of urls) {
        if (await runTest(url)) success++;
    }
    console.log(`\nRESILIENCE TEST: ${success}/${urls.length}`);
}

main();
