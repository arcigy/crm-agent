import directus from "./src/lib/directus";
import { readItems } from "@directus/sdk";

async function check() {
  try {
    const items = await directus.request(readItems("ai_personalization", { limit: 1 }));
    if (items.length > 0) {
      console.log("ALL FIELDS:", JSON.stringify(Object.keys(items[0]), null, 2));
    } else {
      console.log("No items found in ai_personalization");
    }
  } catch (e: any) {
    console.error("FAIL:", e.message);
  }
}
check();
