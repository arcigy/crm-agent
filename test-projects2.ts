import directus from "./src/lib/directus";
import { createItem } from "@directus/sdk";

async function testProjectCreation() {
   try {
       const result = await directus.request(createItem("projects", {
           name: "Test Project",
           project_type: "Test",
           contact_id: 273, // Testing valid number
           contact_name: "Peter Malý",
           value: 100, // Small value 
           user_email: "branislav@arcigy.group",
           date_created: new Date().toISOString()
       }));
       console.log("Create success:", result);
   } catch (e: any) {
       console.error("Create error:", e.message);
   }
}

testProjectCreation();
