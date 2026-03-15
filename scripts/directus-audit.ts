import directus from "../src/lib/directus";
import { readCollections } from "@directus/sdk";
import * as dotenv from "dotenv";

dotenv.config();

async function runDirectusAudit() {
  console.log("📊 Running Directus Audit (Collections)...\n");

  try {
    const collections = await directus.request(readCollections());
    console.log("Found collections:");
    const publicCollections = (collections as any[]).filter(c => !c.collection.startsWith('directus_'));
    console.table(publicCollections.map(c => ({
      collection: c.collection,
      note: c.meta?.note || '',
      singleton: c.meta?.singleton || false
    })));

  } catch (error) {
    console.error("❌ Directus audit failed:", error);
  } finally {
    process.exit(0);
  }
}

runDirectusAudit();
