import * as fs from 'fs';
import * as path from 'path';

// This test evaluates if EVERY tool defined in the ALL_ATOMS registry has
// a corresponding executor implementation in the agent-executors (or sub-executors) files.
// Protects against Schema-Code drift !

function countOccurrences(content: string, substring: string) {
    let count = 0;
    let pos = content.indexOf(substring);
    while (pos !== -1) {
        count++;
        pos = content.indexOf(substring, pos + substring.length);
    }
    return count;
}

export async function runParityTests() {
    const srcActionsDir = path.join(__dirname, '..', 'src', 'app', 'actions');
    
    // 1. Read registry to find all tools
    const registryPath = path.join(srcActionsDir, 'agent-registry.ts');
    if (!fs.existsSync(registryPath)) {
        console.error("❌ Mising registry file:", registryPath);
        process.exit(1);
    }

    const registryContent = fs.readFileSync(registryPath, 'utf8');
    const toolRegex = /name:\s*"([^"]+)"/g;
    const definedTools: string[] = [];
    let match;
    while ((match = toolRegex.exec(registryContent)) !== null) {
        definedTools.push(match[1]);
    }

    console.log(`[PARITY TEST] Found ${definedTools.length} tools defined in agent-registry.ts`);

    if (definedTools.length === 0) {
        console.error("❌ No tools parsed correctly. Regex failed.");
        process.exit(1);
    }

    // 2. Read all executor files recursively
    let executorFiles: string[] = [];
    function findExecutors(dir: string) {
        const items = fs.readdirSync(dir);
        for (const item of items) {
            const p = path.join(dir, item);
            if (fs.statSync(p).isDirectory()) {
                findExecutors(p);
            } else if (p.includes('executor') || p.includes('verifier') || p.includes('sys-tools')) {
                executorFiles.push(p);
            }
        }
    }
    findExecutors(srcActionsDir);
    
    let combinedExecutorsContent = "";
    for (const p of executorFiles) {
        combinedExecutorsContent += fs.readFileSync(p, 'utf8') + "\n";
    }

    const missingExecutors: string[] = [];
    for (const tool of definedTools) {
        // Look for case "tool_name": or checking exact if/case match
        // Because string may also just be matched as === "tool_name", we search for quotes or backticks
        const caseMatch = `case "${tool}":`;
        const quotesMatch = `"${tool}"`;
        const matchFound = combinedExecutorsContent.includes(caseMatch) || 
                           countOccurrences(combinedExecutorsContent, quotesMatch) > 0;
        
        if (!matchFound) {
            missingExecutors.push(tool);
        }
    }

    if (missingExecutors.length > 0) {
        console.error("\n❌ PARITY TEST FAILED!");
        console.error("The following tools are defined in agent-registry.ts but not handled in any executor file:");
        for (const missing of missingExecutors) {
            console.error(`  -> ${missing}`);
        }
        process.exit(1);
    }

    console.log("\n✅ PARITY TEST PASSED!");
    console.log(`All ${definedTools.length} tools have corresponding executor logic mapped.\n`);
    process.exit(0);
}

runParityTests();
