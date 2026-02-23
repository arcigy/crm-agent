import { executeDbContactTool } from "./src/app/actions/executors-db-contacts";
import { executeDbProjectTool } from "./src/app/actions/executors-db-projects";
import { executeDbDealTool } from "./src/app/actions/executors-db-deals";
import { executeDbTaskTool } from "./src/app/actions/executors-tasks";
import { executeDbLeadTool } from "./src/app/actions/executors-leads";
import { executeSysTool } from "./src/app/actions/executors-sys-drive";

const TEST_EMAIL = "branislav@arcigy.group";
const TEST_ID = "user_2test"; // Arbitrary ID for tests that don't enforce clerk verification like bulk 

async function runTests() {
   console.log("Starting backend tools test...");

   try {
       console.log("1. Testing db_find_duplicate_contacts...");
       const r1 = await executeDbContactTool("db_find_duplicate_contacts", {}, TEST_EMAIL);
       console.log("OK:", (r1 as any).message);
   } catch (e: any) { console.error("FAIL 1:", e.message); }

   try {
       console.log("2. Testing db_search_deals...");
       const r2 = await executeDbDealTool("db_search_deals", { query: "A" }, TEST_EMAIL);
       console.log("OK:", (r2 as any).message);
   } catch (e: any) { console.error("FAIL 2:", e.message); }

   try {
       console.log("3. Testing db_get_overdue_tasks...");
       const r3 = await executeDbTaskTool("db_get_overdue_tasks", {}, TEST_EMAIL);
       console.log("OK:", (r3 as any).message);
   } catch (e: any) { console.error("FAIL 3:", e.message); }

   try {
       console.log("4. Testing sys_generate_report...");
       const r4 = await executeSysTool("sys_generate_report", { 
           report_topic: "Test report", 
           data_context: "Some raw data..."
       }, TEST_ID);
       console.log("OK:", (r4 as any).message);
   } catch (e: any) { console.error("FAIL 4:", e.message); }
   
   // Don't modify database randomly for lead conversion or bulk update yet unless we have dummy ids.
   // Let's test read only operations first
   
   try {
       console.log("5. Testing db_get_contacts_without_activity...");
       const r5 = await executeDbContactTool("db_get_contacts_without_activity", { days: 30 }, TEST_EMAIL);
       console.log("OK:", (r5 as any).message);
   } catch (e: any) { console.error("FAIL 5:", e.message); }

   try {
       console.log("6. Testing db_get_deals_by_stage...");
       const r6 = await executeDbDealTool("db_get_deals_by_stage", { stage: "won" }, TEST_EMAIL);
       console.log("OK:", (r6 as any).message);
   } catch (e: any) { console.error("FAIL 6:", e.message); }

   console.log("End of standalone tool tests.");
}

runTests();
