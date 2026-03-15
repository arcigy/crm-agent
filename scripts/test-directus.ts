import { createDirectus, rest, staticToken, createItem } from '@directus/sdk';

const DIRECTUS_URL = "https://directus-buk1-production.up.railway.app";
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN;
if (!DIRECTUS_TOKEN) throw new Error("DIRECTUS_TOKEN env variable is required");

const directus = createDirectus(DIRECTUS_URL).with(staticToken(DIRECTUS_TOKEN)).with(rest());

async function test() {
  try {
    const res = await directus.request(createItem('messages', {
        conversation_id: 2,
        role: 'user',
        content: "Test message"
    }));
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
