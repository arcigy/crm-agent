import { executeSysTool } from "./src/app/actions/executors-sys-drive";
import directus from "./src/lib/directus";
import { readItems, createItem } from "@directus/sdk";

async function testProjectCreation() {
   try {
       // Try creating with STRING
       const result = await directus.request(createItem("projects", {
           name: "Test Project",
           project_type: "Test",
           contact_id: "273", // Testing string
           contact_name: "Peter Malý",
           value: 150000,
           user_email: "branislav@arcigy.group",
           date_created: new Date().toISOString()
       }));
       console.log("Create with STRING success:", result);
   } catch (e: any) {
       console.error("Create with STRING error:", e.message);
       if (e.errors) console.error("Details:", JSON.stringify(e.errors));
   }
}

testProjectCreation();
