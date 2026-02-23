import "dotenv/config";
import { runOrchestratorLoop } from "../src/app/actions/agent-orchestrator";
import { verifyExecutionResults } from "../src/app/actions/agent-verifier";
import { ChecklistItem, MissionHistoryItem, MissionState, UserResource } from "../src/app/actions/agent-types";
import { createStreamableValue } from "@ai-sdk/rsc";

async function runAutonomousTest() {
    console.log("🚀 STARTING AUTONOMOUS LIVE TEST");

    const TEST_USER: UserResource = {
        id: "test-user-autonomous",
        emailAddresses: [{ emailAddress: "branislav@arcigy.group" }],
    };

    let missionPrompt = process.argv[2] || "Vytvor kontakt pre 'Agent Antigravity' (antigravity@arcigy.cloud), priraď k nemu projekt 'Testovacia Misia' so sumou 777 eur a pridaj do pamäte že tento test bol úspešný.";
    
    // If the argument ends in .txt, read from that file
    if (missionPrompt.endsWith(".txt") && require('fs').existsSync(missionPrompt)) {
        missionPrompt = require('fs').readFileSync(missionPrompt, 'utf8');
    }

    const messages = [
        { role: "user" as const, content: missionPrompt }
    ];

    // Mock superState to capture updates
    const superState = {
        update: (data: any) => {
            if (data.message) console.log(`[STATE UPDATE] ${data.message} ${data.status || ''}`);
        },
        done: (data: any) => {
            console.log(`[STATE DONE] Content: ${data.content.substring(0, 200)}...`);
        },
        error: (err: any) => {
            console.error(`[STATE ERROR] ${err}`);
        },
        value: null
    } as any;

    try {
        console.log(`[MISSION] ${missionPrompt}`);
        
        const result = await runOrchestratorLoop(messages, TEST_USER, superState);
        
        console.log("\n[ORCHESTRATOR LOOP FINISHED]");
        console.log(`- Final Results Count: ${result.finalResults.length}`);
        console.log(`- Iterations: ${result.attempts}`);
        
        console.log("\n[VERIFYING RESULTS...]");
        
        let finalResponse = "";
        const missionStatus = (result as any).status;

        if (missionStatus === "clarify") {
            finalResponse = "POTREBUJEM DOPLNIŤ: " + result.lastPlan?.thought || "Potrebujem doplňujúce informácie.";
        } else if (missionStatus === "error") {
            finalResponse = "CHYBA: " + result.lastPlan?.thought || "Vyskytla sa chyba.";
        } else {
            const verification = await verifyExecutionResults(missionPrompt, result.finalResults);
            finalResponse = verification.analysis;
        }
        
        console.log("\n[FINAL AGENT RESPONSE]");
        console.log("-----------------------------------------");
        console.log(finalResponse);
        console.log("-----------------------------------------");

        console.log("\n✅ AUTONOMOUS TEST COMPLETED");
    } catch (error) {
        console.error("❌ TEST FAILED:", error);
        process.exit(1);
    }
}

runAutonomousTest();
