
import 'dotenv/config';
import { routeIntent } from '../src/app/actions/agent-router';
import { orchestrateParams } from '../src/app/actions/agent-orchestrator';
import { executeAtomicTool } from '../src/app/actions/agent-executors';
import { verifyExecutionResults } from '../src/app/actions/agent-verifier';
import { buildExecutionManifest } from '../src/app/actions/agent-manifest-builder';
import { selfReflect } from '../src/app/actions/agent-self-reflector';
import { extractAndStoreIds } from '../src/app/actions/agent-self-corrector';
import { MissionState, ChatMessage, ToolResult } from '../src/app/actions/agent-types';

/**
 * TOKEN MONITORING HELPER
 * Estimates tokens (4 chars = 1 token approx)
 */
function logTokenStats(tag: string, content: string) {
    const chars = content.length;
    const tokens = Math.ceil(chars / 4);
    console.log(`   📊 [${tag}] Size: ${chars} chars (~${tokens} tokens)`);
}

const mockUser = {
    id: "user_2shY9NshREPrS7M0n9mQG5v8W0A",
    emailAddresses: [{ emailAddress: "branislav@arcigy.group" }]
};

async function runPipeline(userMsg: string, history: ChatMessage[], state: MissionState) {
    console.log(`\n💬 USER: "${userMsg}"`);
    
    // 1. Router
    const routing = await routeIntent(userMsg, history);
    console.log(`   [ROUTER] Intent: ${routing.type}`);

    if (routing.type === 'CONVERSATION') {
        const reply = "Rozumiem, budem si to pamätať.";
        console.log(`   [AGENT] ${reply}`);
        history.push({ role: 'user', content: userMsg });
        history.push({ role: 'assistant', content: reply });
        return;
    }

    // 2. Orchestrator Loop
    let iter = 0;
    const localMissionHistory: any[] = [];
    
    while (iter < 10) {
        iter++;
        // Monitor Orchestrator context
        const taskPlan = await orchestrateParams(history, localMissionHistory, state, routing.orchestrator_brief);
        
        // Token health check
        const promptEstimate = JSON.stringify(taskPlan).length / 4;
        if (promptEstimate > 800000) {
            console.warn(`   ⚠️ High Token Usage Detected: ~${promptEstimate.toFixed(0)} tokens. Flash might struggle.`);
        }

        if (!taskPlan.steps?.length) break;

        for (const step of taskPlan.steps) {
            console.log(`   [STEP ${iter}] Planning: ${step.tool}`);
            const res = await executeAtomicTool(step.tool, step.args, mockUser as any);
            console.log(`   [EXEC] Result: ${res.success ? '✅' : '❌'}`);

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
            
            // CRITICAL FIX: Update local mission history so orchestrator knows this step is DONE
            localMissionHistory.push({
                steps: [step],
                verification: { success: res.success }
            });

            if (!res.success) break;
        }
    }

    // 3. Manifest & Verifier
    const goal = routing.orchestrator_brief_structured?.goal || userMsg;
    const manifest = buildExecutionManifest(goal, state);
    
    // Monitor Verifier context
    logTokenStats("VERIFIER_INPUT", JSON.stringify(manifest));

    console.log("   [REFLECTOR] Auditing...");
    const reflection = await selfReflect(goal, manifest);
    console.log(`   [REFLECTOR] Confidence: ${reflection.confidence * 100}%`);

    const verification = await verifyExecutionResults(userMsg, [], manifest);
    console.log(`   [AGENT] ${verification.analysis}`);
    
    // Update history for next turn
    history.push({ role: 'user', content: userMsg });
    history.push({ role: 'assistant', content: verification.analysis });
}

async function runMarathon() {
    console.log("🏃 STARTING MARATHON CONVERSATION STRESS TEST (10+ TURNS)");
    const history: ChatMessage[] = [];
    const state: MissionState = {
        iteration: 0,
        resolvedEntities: {},
        completedTools: [],
        lastToolResult: null,
        allResults: [],
        correctionAttempts: 0,
        toolCallCounts: {}
    };

    const script = [
        "Ahoj, chcel by som začať pracovať na novom klientovi Google Slovakia.",
        "Nájdi mi v CRM niekoho z firmy Goog- oh počkaj, Peter Malý je z TechCorpu, však? Nájdi Petra Malého.",
        "Dobre, Peter je náš človek pre Google. Zapamätaj si, že Peter preferuje kávu namiesto čaju, je to dôležitý detail pre mítingy.",
        "Vytvor pre Petra projekt 'Google Nexus 2026' s budžetom 120 000 eur.",
        "Vieš čo, ten budžet je moc veľký. Uprav projekt na 80 000 eur a priraď mu status 'vyjednávanie'.",
        "Aha, a ešte k tomu projektu pridaj poznámku: 'Peter má rad kávu' - využi to, čo sme si hovorili predtým.",
        "Teraz mi zisti, aké všetky projekty máme momentálne otvorené pre firmu TechCorp (alebo pre Petra).",
        "Dobre, vyber ten najstarší z nich a naplánuj mi k nemu úlohu 'Revízia starej zmluvy' na budúci pondelok.",
        "Počkaj, pondelok je zlý. Presuň tú úlohu radšej na utorok.",
        "Okej, a teraz úplne iná vec: Vyhľadaj na webe, aké sú aktuálne novinky o firme Google na Slovensku, nech som v obraze.",
        "Výborne. Na záver pošli Petrovi email, že projekt 'Google Nexus' sme upravili a už sa tešíme na tú kávu u neho."
    ];

    for (const msg of script) {
        await runPipeline(msg, history, state);
        console.log("------------------------------------------");
    }

    console.log("\n🏁 MARATHON FINISHED. ALL TURNS PROCESSED.");
}

runMarathon();
