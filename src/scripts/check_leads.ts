
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

const FILE_PATH = "leads_processed.csv";

function check() {
    const content = fs.readFileSync(path.join(process.cwd(), FILE_PATH), 'utf-8');
    const parsed = Papa.parse(content, { header: true });
    const records = parsed.data as any[];

    const count = records.filter(r => r.ai_first_sentence && r.ai_first_sentence.includes('(')).length;
    console.log(`Found ${count} records with parentheses in ai_first_sentence.`);
    
    if (count > 0) {
        records.forEach((r, i) => {
            if (r.ai_first_sentence && r.ai_first_sentence.includes('(')) {
                if (i < 515) { // Only log processed ones
                   console.log(`Row ${i+2}: ${r.ai_first_sentence}`);
                }
            }
        });
    }
}

check();
