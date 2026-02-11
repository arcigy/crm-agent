import directus from "./directus";
import { readItems } from "@directus/sdk";

async function checkToken() {
  try {
    const tokens = await directus.request(
      readItems("google_tokens" as any, {
        filter: { user_email: { _eq: "branislav@arcigy.group" } },
        limit: 1,
      })
    );
    console.log("Token for branislav@arcigy.group:", JSON.stringify(tokens, null, 2));
  } catch (err) {
    console.error("Error checking token:", err);
  }
}

checkToken();
