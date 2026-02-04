
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const INPUT_FILE = "dataset_crawler-google-places_2026-02-04_15-37-26-089.csv";
const OUTPUT_FILE = "leads_processed.csv";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function reworkCompanyName(name: string): string {
    if (!name) return "";
    let clean = name;
    clean = clean.replace(/,? s\.r\.o\.?/gi, '').replace(/,? s\. r\. o\.?/gi, '').replace(/,? a\.s\.?/gi, '').replace(/,? spol\. s r\.o\.?/gi, '').replace(/,? s\.r\.o/gi, '');
    clean = clean.replace(/\.sk/gi, '').replace(/\.com/gi, '').replace(/\.info/gi, '').replace(/\.net/gi, '');
    const separators = [' - ', ' | ', ' – ', ':', '—'];
    separators.forEach(sep => { if (clean.includes(sep)) clean = clean.split(sep)[0]; });
    const industries = ['PLYN', 'ENERGO', 'STAV', 'STRECHY', 'VODA', 'KURENIE', 'ELEKTRO', 'KLIMA', 'OKNA', 'DVERE', 'BRANY', 'MONT', 'SERVIS'];
    const words = clean.trim().split(/\s+/);
    if (words.length > 1 && (words[0].length <= 5 || industries.includes(words[1].toUpperCase()))) return words[0].toUpperCase();
    return clean.trim();
}

function getVocalizedV(companyName: string): string {
    const firstChar = companyName.trim().charAt(0).toLowerCase();
    if (firstChar === 'v' || firstChar === 'f') return "vo";
    return "v";
}

async function scrapeWebsite(url: string): Promise<string> {
    if (!url || url === "" || url === "null") return "no content";
    try {
        const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
        const html = await response.text();
        return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                   .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
                   .replace(/<[^>]+>/g, ' ')
                   .replace(/\s+/g, ' ')
                   .trim().substring(0, 10000); 
    } catch (e) { return "no content"; }
}

async function generateAIContent(reworkedName: string, scrapedContent: string) {
    if (!scrapedContent || scrapedContent === "no content") return { abstract: "no content", icebreaker: "" };
    const prep = getVocalizedV(reworkedName);
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "Ste expert na personalizovaný outreach. Používajte FORMÁLNY TÓN (vykanie). Výstup JSON. NEPRIDÁVAJTE žiadne vysvetlivky, poznámky ani text v zátvorkách na koniec vety." },
                { role: "user", content: `Web: ${scrapedContent}\n\nFirma: ${reworkedName}\n\n1.Abstrakt (2 odstavce, spartan)\n2.Icebreaker začínajúci: \"Dobrý deň. Páči sa mi, že ${prep} ${reworkedName} sa venujete...\" (formálne vykanie, vyplňte detaily).\n\nDÔLEŽITÉ: Výstup nesmie obsahovať žiadne zátvorky ani komentáre k vokalizácii. Len čistý text.\n\nOutput JSON: {\"abstract\": \"...\", \"icebreaker\": \"...\"}` }
            ],
            response_format: { type: "json_object" }
        });
        return JSON.parse(response.choices[0].message.content || "{}");
    } catch (e) { return { abstract: "error", icebreaker: "" }; }
}

async function run() {
    const fileContent = fs.readFileSync(path.join(process.cwd(), INPUT_FILE), 'utf-8');
    const parsed = Papa.parse(fileContent, { header: true, skipEmptyLines: true });
    const records = parsed.data as any[];
    const AI_LIMIT = 515; 
    const finalData = new Array(records.length);

    console.log(`Processing total ${records.length} records. AI Limit: ${AI_LIMIT}`);

    // Process AI records in parallel batches
    const BATCH_SIZE = 25;
    for (let i = 0; i < AI_LIMIT; i += BATCH_SIZE) {
        const batch = records.slice(i, Math.min(i + BATCH_SIZE, AI_LIMIT));
        console.log(`Processing batch ${i} to ${i + batch.length}...`);
        
        await Promise.all(batch.map(async (r, idx) => {
            const currentIdx = i + idx;
            const reworked = reworkCompanyName(r.title);
            let abstract = "", icebreaker = "";
            if (r.website && r.website !== "null" && r.website !== "") {
                const content = await scrapeWebsite(r.website);
                const ai = await generateAIContent(reworked, content);
                abstract = ai.abstract;
                icebreaker = ai.icebreaker;
            }
            finalData[currentIdx] = {
                title: r.title,
                company_name_reworked: reworked,
                website: r.website,
                phone: r.phone,
                city: r.city,
                category: r.categoryName || r['categories/0'],
                abstract,
                ai_first_sentence: icebreaker
            };
        }));
    }

    // Process remaining non-AI records
    for (let i = AI_LIMIT; i < records.length; i++) {
        const r = records[i];
        finalData[i] = {
            title: r.title,
            company_name_reworked: reworkCompanyName(r.title),
            website: r.website,
            phone: r.phone,
            city: r.city,
            category: r.categoryName || r['categories/0'],
            abstract: "",
            ai_first_sentence: ""
        };
        if (i % 100 === 0) console.log(`Mapped ${i} rows...`);
    }

    fs.writeFileSync(path.join(process.cwd(), OUTPUT_FILE), Papa.unparse(finalData));
    console.log(`Success! saved to ${OUTPUT_FILE}`);
}

run().catch(console.error);
