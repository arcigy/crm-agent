import directus from "./src/lib/directus";

async function testSchema() {
   try {
       // Inspect the schema of "projects" table
       const res = await directus.request(() => ({
          method: 'GET',
          path: '/fields/projects/value',
       }));
       console.log("Schema for value:", JSON.stringify(res, null, 2));
   } catch (e: any) {
       console.error("Schema error:", e.message);
   }
}

testSchema();
