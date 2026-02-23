import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

const google = createGoogleGenerativeAI({
  apiKey: "3cSXW-vP-3ujjyXvS0-htoPcsSQOZ5GE" // wait, this is directus token!
});

// The server has GEMINI_API_KEY in its .env
// We can use dotenv to load it, or just pass it if we run it via bun / tsx with dotenv

require("dotenv").config({ path: ".env" });
require("dotenv").config({ path: ".env.local" });

async function test() {
  console.log("Starting generateText...");
  const googleAI = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const start = Date.now();
    const result = await generateText({
      model: googleAI("gemini-2.0-flash-lite"), // The user might be using 2.0-flash-lite or similar
      prompt: "Odpovec iba slovo AHOJ",
    });
    console.log("Result:", result.text);
    console.log("Time:", Date.now() - start, "ms");
  } catch (e: any) {
    console.error("Error:", e.message);
  }
}

test();
