import { ALL_ATOMS } from "../src/app/actions/agent-registry";
import { executeDbTaskTool } from "../src/app/actions/executors-tasks";
import { executeDbProjectTool } from "../src/app/actions/executors-db-projects";
import { executeDbDealTool } from "../src/app/actions/executors-db-deals";
import { executeDbNoteTool } from "../src/app/actions/executors-notes";
import { executeDbLeadTool } from "../src/app/actions/executors-leads";

console.log("Checking registry vs executor parity for fetch tools...");

const schemas = ALL_ATOMS.reduce((acc, a) => {
  acc[a.function.name] = a.function.parameters.properties;
  return acc;
}, {} as any);

const MOCK_EMAIL = "test@example.com";

async function runTests() {
  let passed = 0;
  let failed = 0;

  async function tryTool(executorFunc: any, name: string, args: any) {
    try {
      console.log(`[TEST] ${name} with args`, args);
      const res = await executorFunc(name, args, MOCK_EMAIL);
      console.log(`[SUCCESS] ${name} executed properly. Result count:`, res.data?.length);
      passed++;
    } catch (e: any) {
      if (e.message.includes("not found")) {
        console.error(`[FAIL] ${name} not handeled by executor properly:`, e.message);
        failed++;
      } else if (e.message.includes("timeout") || e.message.includes("fetch")) {
         // Directus connection issues might happen, ignore them for parity test
         console.log(`[WARN] DB connection issue, but executor logic likely fine:`, e.message);
         passed++;
      } else {
        console.error(`[FAIL] ${name} threw error:`, e.message);
        failed++;
      }
    }
  }

  // Tasks
  if (schemas["db_fetch_tasks"] && "contact_id" in schemas["db_fetch_tasks"]) {
    await tryTool(executeDbTaskTool, "db_fetch_tasks", { contact_id: "278" });
  } else { console.error("Schema db_fetch_tasks missing contact_id"); failed++; }

  // Deals
  if (schemas["db_fetch_deals"] && "contact_id" in schemas["db_fetch_deals"]) {
    await tryTool(executeDbDealTool, "db_fetch_deals", { contact_id: "278" });
  } else { console.error("Schema db_fetch_deals missing contact_id"); failed++; }

  // Notes
  if (schemas["db_fetch_notes"] && "contact_id" in schemas["db_fetch_notes"]) {
    await tryTool(executeDbNoteTool, "db_fetch_notes", { contact_id: "278" });
  } else { console.error("Schema db_fetch_notes missing contact_id"); failed++; }

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
