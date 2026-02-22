import directus from "./src/lib/directus";

async function testSchema() {
   try {
       // Inspect the schema of "projects" table
       const res = await directus.request(() => ({
          method: 'GET',
          path: '/fields/projects/contact_id',
       }));
       console.log("Schema for contact_id:", JSON.stringify(res, null, 2));
   } catch (e: any) {
       console.error("Schema error:", e.message);
   }
}

testSchema();
