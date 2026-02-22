
import 'dotenv/config';
import { routeIntent } from '../src/app/actions/agent-router';
import { orchestrateParams } from '../src/app/actions/agent-orchestrator';
import { executeAtomicTool } from '../src/app/actions/agent-executors';
import { verifyExecutionResults } from '../src/app/actions/agent-verifier';
import { buildExecutionManifest } from '../src/app/actions/agent-manifest-builder';
import { selfReflect } from '../src/app/actions/agent-self-reflector';
import { extractAndStoreIds } from '../src/app/actions/agent-self-corrector';
import { MissionState, ToolResult } from '../src/app/actions/agent-types';

const mockUser = {
    id: "user_2shY9NshREPrS7M0n9mQG5v8W0A",
    emailAddresses: [{ emailAddress: "branislav@arcigy.group" }]
};

async function runMegaMission() {
    console.log("🚀 STARTING MEGA-MISSION STRESS TEST (10+ TOOL STEPS)");
    const MISSION = `
    Dnes budeme robiť veľké upratovanie a setup:
    1. Nájdi kontakt Peter Malý.
    2. Vytvor mu nový projekt 'Enterprise Q1' v hodnote 100 000 eur.
    3. Pridaj mu k dnešnému dňu aktivitu typu 'call' so subjektom 'Úvodný kick-off'.
    4. Vytvor si poznámku (note) s nadpisom 'Peter - Strategický plán' a obsahom 'Klient chce expandovať do Dubaja'.
    5. Nastav Petrovi nový komentár v CRM: 'Prioritný klient pre tento kvartál'.
    6. Vyhľadaj všetky projekty, ktoré sú v CRM.
    7. Vyber z nich ten najnovší a zmeň mu stage na 'negotiation'.
    8. Vytvor úlohu (task) pre mňa s názvom 'Pripraviť zmluvu pre Petra' na zajtra.
    9. Skontroluj, či sa Peter nachádza v pamäti systému (sys_capture_memory) - ak nie, ulož tam, že preferuje komunikáciu cez WhatsApp.
    10. Na záver mu pošli email (alebo len draft), že všetko je pripravené a tešíme sa na spoluprácu.
    `;

    console.log(`\n📋 MISSION:\n${MISSION.trim()}`);
    const startMission = Date.now();

    const state: MissionState = {
        iteration: 0,
        resolvedEntities: {},
        completedTools: [],
        lastToolResult: null,
        allResults: [],
        correctionAttempts: 0,
        toolCallCounts: {}
    };

    const history: any[] = [];
    const routing = await routeIntent(MISSION, []);
    console.log(`\n[ROUTER] Intent: ${routing.type}`);

    let iter = 0;
    // We expanded loop limit to 10 in route.ts, so we use it here too
    while (iter < 10) {
        iter++;
        const iterStart = Date.now();
        console.log(`\n[STEP ${iter}/10] Planning...`);
        
        const plan = await orchestrateParams(history, [], state, routing.orchestrator_brief);
        
        if (!plan.steps?.length) {
            console.log("   No more steps. Finalizing.");
            break;
        }

        // Run all steps planned for this iteration (often 1-3 steps)
        for (const step of plan.steps) {
            console.log(`   🔸 Executing: ${step.tool} (${JSON.stringify(step.args).substring(0, 100)}...)`);
            const res = await executeAtomicTool(step.tool, step.args, mockUser as any);
            console.log(`   🔹 Result: ${res.success ? '✅ SUCCESS' : '❌ FAILED'}`);

            const toolResult: ToolResult = {
                tool: step.tool,
                success: res.success,
                data: (res as any).data,
                error: (res as any).error,
                message: (res as any).message,
                originalArgs: step.args
            };

            extractAndStoreIds(toolResult, state);
            state.allResults.push(toolResult);
            state.completedTools.push(step.tool);
            history.push({ 
                steps: [step], 
                verification: { success: res.success } 
            });
        }
        console.log(`   Done in ${((Date.now() - iterStart)/1000).toFixed(1)}s`);
    }

    console.log("\n--- Post-Mission Analysis ---");
    const manifest = buildExecutionManifest(routing.orchestrator_brief || MISSION, state);
    console.log(`[MANIFEST] Steps total: ${manifest.entries.length}`);
    
    console.log("[SELF-REFLECTOR] Auditing...");
    const reflection = await selfReflect(MISSION, manifest);
    console.log(`[REFLECTOR] Goal Achieved: ${reflection.goalAchieved} | Action: ${reflection.suggestedAction}`);

    console.log("[VERIFIER] Synthesizing final response in Slovak...");
    const verification = await verifyExecutionResults(MISSION, [], manifest);

    const totalTime = ((Date.now() - startMission)/1000).toFixed(1);
    console.log("\n==========================================");
    console.log("FINAL AGENT RESPONSE:");
    console.log("------------------------------------------");
    console.log(verification.analysis);
    console.log("------------------------------------------");
    console.log(`TOTAL MISSION TIME: ${totalTime}s`);
    console.log(`TOTAL TOOLS RUN: ${state.allResults.length}`);
    console.log("==========================================\n");
}

runMegaMission();
