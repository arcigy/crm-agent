
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
    
    // Remove s.r.o. and variants
    clean = clean.replace(/,? s\.r\.o\.?/gi, '');
    clean = clean.replace(/,? s\. r\. o\.?/gi, '');
    clean = clean.replace(/,? a\.s\.?/gi, '');
    clean = clean.replace(/,? spol\. s r\.o\.?/gi, '');
    clean = clean.replace(/,? s\.r\.o/gi, '');
    
    // Remove website suffixes
    clean = clean.replace(/\.sk/gi, '').replace(/\.com/gi, '').replace(/\.info/gi, '').replace(/\.net/gi, '');
    
    // Split by common separators
    const separators = [' - ', ' | ', ' – ', ':', '—'];
    separators.forEach(sep => {
        if (clean.includes(sep)) {
            clean = clean.split(sep)[0];
        }
    });

    // Special: if it starts with an acronym or brand (JN PLYN, KVP ENERGO)
    // We want the first word if it represents the company name
    const commonIndustryWords = ['PLYN', 'ENERGO', 'STAV', 'STRECHY', 'VODA', 'KURENIE', 'ELEKTRO', 'KLIMA', 'OKNA', 'DVERE', 'BRANY', 'MONT', 'SERVIS'];
    const words = clean.trim().split(/\s+/);
    
    if (words.length > 1) {
        const firstWordUpper = words[0].toUpperCase();
        const secondWordUpper = words[1].toUpperCase();
        
        // If first word is short (acronym) or second word is a common industry term
        if (words[0].length <= 5 || commonIndustryWords.includes(secondWordUpper)) {
            return words[0].toUpperCase();
        }
    }

    return clean.trim();
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
                   .trim()
                   .substring(0, 10000); 
    } catch (e) {
        return "no content";
    }
}

async function generateAIContent(reworkedName: string, scrapedContent: string) {
    if (!scrapedContent || scrapedContent === "no content") {
        return { abstract: "no content", icebreaker: "" };
    }

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "You are an expert personalized outreach assistant. Output only valid JSON. Fill all placeholders with REAL data or logical guesses based on the content. DO NOT output curly braces in the final string."
                },
                {
                    role: "user",
                    content: `
Úloha: Máte k dispozícii sken webovej stránky firmy ${reworkedName}.

1. Abstrakt: Komplexný dvojodstavcový abstrakt (spartan tone). Vyhnite sa klišé.
2. Personalizovaný icebreaker.

Web content:
${scrapedContent}

Výsledok MUSÍ byť v nasledujúcom formáte JSON (nahraďte informácie v zátvorkách skutočným obsahom z webu):
{
  "abstract": "...",
  "icebreaker": "Ahoj {name}. Páči sa mi, že sa venujete {konkrétna_vec_z_webu} – takisto sa venujem/mám rád/som fanúšikom {súvisiaca_vec}. Chcel som s vami niečo prebrať.\\n\\nDúfam, že mi odpustíte, ale dosť podrobne som si prešiel vás aj vašu stránku a viem, že {špecifický_detail} je pre vás dôležité. Pred pár mesiacmi som dal dokopy niečo, čo by podľa mňa mohlo pomôcť. Aby som to skrátil, ide o systém oslovovania, ktorý využíva AI na vyhľadávanie ľudí najímajúcich tvorcov webov. Potom ich osloví pomocou šablón (v skutočnosti im vytvorí demo webovú stránku). Prevádzka stojí len pár centov, má veľmi vysokú konverziu a myslím si, že je to v súlade s {predpokladaná_hodnota_firmy}."
}

Rules:
- Spartan, lakonický tón.
- Vyplňte polia {name}, {konkrétna_vec_z_webu}, {súvisiaca_vec}, {špecifický_detail}, {predpokladaná_hodnota_firmy} reálnymi dátami z textu. Ak meno nie je známe, použite 'tím/kolegovia z ${reworkedName}'.
- Neočividná personalizácia.
- Jazyk: Slovenský.
`
                }
            ],
            response_format: { type: "json_object" }
        });

        const content = response.choices[0].message.content;
        return JSON.parse(content || "{}");
    } catch (e) {
        console.error("AI Error:", e);
        return { abstract: "error", icebreaker: "" };
    }
}

async function run() {
    const fileContent = fs.readFileSync(path.join(process.cwd(), INPUT_FILE), 'utf-8');
    const parsed = Papa.parse(fileContent, { header: true, skipEmptyLines: true });
    let records = parsed.data as any[];

    console.log(`Starting processing of ${records.length} records...`);
    
    // We'll process 15 records with AI for demonstration.
    const AI_LIMIT = 15; 
    const finalData = [];

    for (let i = 0; i < records.length; i++) {
        const r = records[i];
        const reworked = reworkCompanyName(r.title);
        
        let abstract = "";
        let icebreaker = "";

        if (i < AI_LIMIT && r.website && r.website !== "null" && r.website !== "") {
            console.log(`[${i+1}/${AI_LIMIT}] AI processing for: ${reworked}`);
            const content = await scrapeWebsite(r.website);
            const ai = await generateAIContent(reworked, content);
            abstract = ai.abstract;
            icebreaker = ai.icebreaker;
        }

        finalData.push({
            title: r.title,
            company_name_reworked: reworked,
            website: r.website,
            phone: r.phone,
            city: r.city,
            category: r.categoryName || r['categories/0'],
            abstract: abstract,
            ai_first_sentence: icebreaker
        });

        if (i > 0 && i % 100 === 0) console.log(`Processed ${i} rows...`);
    }

    const csvOutput = Papa.unparse(finalData);
    fs.writeFileSync(path.join(process.cwd(), OUTPUT_FILE), csvOutput);
    console.log(`Success! File saved as ${OUTPUT_FILE}`);
}

run().catch(console.error);
