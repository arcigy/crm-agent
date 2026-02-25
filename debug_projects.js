import directus from "./src/lib/directus";
import { readItems } from "@directus/sdk";

async function test() {
  try {
    const res = await directus.request(readItems("projects", { limit: 5 }));
    console.log(JSON.stringify(res, null, 2));
  } catch (e) {
    console.error(e);
  }
}

test();
