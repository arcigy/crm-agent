
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

const FILE_PATH = "leads_processed.csv";

function cleanup() {
    console.log("Cleaning up existing leads...");
    const content = fs.readFileSync(path.join(process.cwd(), FILE_PATH), 'utf-8');
    const parsed = Papa.parse(content, { header: true });
    const records = parsed.data as any[];

    const cleaned = records.map(r => {
        if (r.ai_first_sentence) {
            // Remove everything from the last opening parenthesis to the end of the string
            // but only if it looks like a comment (at the end)
            r.ai_first_sentence = r.ai_first_sentence.replace(/\s*\(.*?\)\s*$/, '').trim();
        }
        return r;
    });

    const csvOutput = Papa.unparse(cleaned);
    fs.writeFileSync(path.join(process.cwd(), FILE_PATH), csvOutput);
    console.log("Cleanup complete!");
}

cleanup();
