import { createDirectus, rest, staticToken, readItems } from '@directus/sdk';

const DIRECTUS_URL = "https://directus-buk1-production.up.railway.app";
const DIRECTUS_TOKEN = "3cSXW-vP-3ujjyXvS0-htoPcsSQOZ5GE";

const directus = createDirectus(DIRECTUS_URL).with(staticToken(DIRECTUS_TOKEN)).with(rest());

async function test() {
  try {
    const res = await directus.request(readItems('messages', { limit: 1 }));
    console.log("Success:", res);
  } catch (e: any) {
    if (e.errors) {
        console.error("Failed:", JSON.stringify(e.errors, null, 2));
    } else {
        console.error("Failed:", e);
    }
  }
}
test();
