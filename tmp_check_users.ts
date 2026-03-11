import directus from "./src/lib/directus";
import { readItems } from "@directus/sdk";

async function check() {
  try {
    const items = await directus.request(readItems("crm_users", { limit: 1 }));
    if (items.length > 0) {
      console.log("FIELDS:", Object.keys(items[0]));
    } else {
      console.log("No items found in crm_users");
    }
  } catch (e: any) {
    console.error("FAIL:", e.message);
  }
}
check();
