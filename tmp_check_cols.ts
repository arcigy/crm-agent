import directus from "./src/lib/directus";
import { readCollections } from "@directus/sdk";

async function check() {
  try {
    const collections = await directus.request(readCollections());
    console.log("COLLECTIONS:", collections.map((c: any) => c.collection).sort());
  } catch (e: any) {
    console.error("FAIL:", e.message);
  }
}
check();
