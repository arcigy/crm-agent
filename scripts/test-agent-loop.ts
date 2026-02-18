
import 'dotenv/config';
import { orchestrateParams } from '../src/app/actions/agent-orchestrator';
import { validateActionPlan } from '../src/app/actions/agent-preparer';
import { executeAiTool } from '../src/app/actions/executors-ai';

// Mock Executor
async function mockExecute(tool: string, args: any) {
    console.log(`[MOCK] Executing ${tool}`, args);

    if (tool === 'db_search_contacts') {
        const q = (args.query || '').toLowerCase();
        if (q.includes('novák') || q.includes('janova')) {
             return { success: true, data: [{ id: 99, first_name: "Jana", last_name: "Jánová", email: "jan.novak@example.com", company: "TechCorp" }], message: 'Contact found' };
        }
        if (q.includes('techcorp')) {
             return { success: true, data: [{ id: 99, first_name: "Jana", last_name: "Jánová", email: "jan.novak@example.com", company: "TechCorp" }], message: 'Contact found' };
        }
        if (q.includes('greenenergy')) {
             return { success: true, data: [{ id: 88, first_name: "Peter", last_name: "Zelený", email: "green@energy.com", company: "GreenEnergy" }], message: 'Contact found' };
        }
        if (q.includes('kováč')) {
             return { success: true, data: [{ id: 77, first_name: "Peter", last_name: "Kováč", email: "kovac@example.com" }], message: 'Contact found' };
        }
        if (q.includes('adamec')) {
             return { success: true, data: [{ id: 66, first_name: "Adam", last_name: "Adamec", email: "adamec@example.com" }], message: 'Contact found' };
        }
        return { success: true, data: [], message: 'No contact found' };
    }
    
    if (tool === 'gmail_fetch_list') {
        const q = (args.q || '').toLowerCase();
        if (q.includes('jan.novak@example.com')) {
             return { success: true, data: [{ id: 'msg_999', subject: 'Project info' }], message: 'Found email' };
        }
        if (q.includes('kovac@example.com')) {
             return { success: true, data: [{ id: 'msg_888', subject: 'Last meeting notes', snippet: 'Dohodli sme sa na...' }], message: 'Found email' };
        }
        return { success: true, data: [{ id: 'msg_123', subject: 'Re: Meeting' }], message: 'Found 1 email' };
    }

    if (tool === 'db_fetch_leads') {
        return { success: true, data: [
            { id: 1, email: 'lead1@test.com', status: 'new' },
            { id: 2, email: 'lead2@test.com', status: 'new' },
            { id: 3, email: 'lead3@test.com', status: 'new' }
        ], message: 'Leads fetched' };
    }

    if (tool === 'db_fetch_deals') {
         return { success: true, data: [{ id: 10, name: 'Big Deal', status: 'open' }], message: 'Deals found' };
    }
    
    if (tool === 'drive_search_file') {
         return { success: true, data: [{ id: 'file_1', name: 'Invoice_2023.pdf', link: 'http://drive...' }], message: 'File found' };
    }

    if (tool === 'db_create_project' || tool === 'db_create_deal') {
        return { success: true, data: { id: Math.floor(Math.random() * 1000) }, message: `Created ${tool}` };
    }

    if (tool === 'sys_execute_plan') {
        // Return a mock ID for the first thing it likely created
        return { success: true, data: { id: 777, nested_ids: [777, 888] }, message: 'Executed batch plan' };
    }

    // Generic successes
    return { success: true, message: `Mock success for ${tool}` };
}

async function runScenario(name: string, userQuery: string) {
    console.log(`\n==================================================`);
    console.log(`🎬 SCENARIO: ${name}`);
    console.log(`❓ Query: "${userQuery}"`);
    console.log(`==================================================`);
    
    let history = [{ role: 'user', content: userQuery }];
    let iterations = 0;
    const MAX_ITERATIONS = 8; // Increased for complex tasks

    while (iterations < MAX_ITERATIONS) {
        iterations++;
        console.log(`\n--- Iteration ${iterations} ---`);
        
        // 1. Plan
        const plan = await orchestrateParams(null, history);
        console.log("📝 Plan:", JSON.stringify(plan.steps, null, 2));

        if (!plan.steps || plan.steps.length === 0) {
            console.log("✅ No more steps. Scenario Complete.");
            break;
        }

        // 2. Validate First Step
        const nextStep = plan.steps[0];
        const validation = await validateActionPlan(plan.intent, [nextStep], history);
        
        if (!validation.valid) {
            console.log("🛑 Blocked by Preparer:", validation.questions[0]);
            console.log("⚠️ Stopping scenario due to missing info (simulation limitation).");
            break;
        }

        // 3. Execute
        const stepToRun = validation.validated_steps[0];
        console.log(`🚀 Executing: ${stepToRun.tool} with args`, stepToRun.args);
        
        const result = await mockExecute(stepToRun.tool, stepToRun.args);
        
        // 4. Update History
        history.push({
            role: 'assistant',
            content: `Tool '${stepToRun.tool}' executed. Output: ${JSON.stringify(result)}`
        });
    }
}

async function runAllScenarios() {
    await runScenario("1. The Deal Closer", 
        "Vytvor nový deal pre firmu 'TechCorp' s hodnotou 5000, pridaj k tomu poznámku, že majú záujem o Full balík, a naplánuj mi follow-up call s ich CEO (Jánová) na budúci utorok o 10:00.");
    
    await runScenario("2. New Project Onboarding", 
        "Založ nový projekt 'Web Redesign' pre klienta 'GreenEnergy', nastav deadline na koniec mesiaca, vytvor mi úlohu 'Pripraviť zmluvu' a pošli im uvítací email.");

    await runScenario("3. Meeting Prep", 
        "Mám o hodinu meeting s 'Petrom Kováčom'. Zisti mi, čo sme spolu naposledy riešili, či máme otvorené nejaké dealy a stiahni mi poslednú faktúru čo sme im poslali.");
    
    await runScenario("4. Cold Outreach", 
        "Nájdi mi posledné 3 nové leady, zmeň im status na 'contacted' a každému priprav personalizovaný email s ponukou našich služieb.");

    await runScenario("5. Invoice Follow-up", 
        "Pozri sa, či 'Adamec' zaplatil tú faktúru za 'Redesign'. Ak nie, pošli mu pripomienku a posuň deadline projektu o týždeň.");
}

runAllScenarios();
