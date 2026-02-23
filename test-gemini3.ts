import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
require("dotenv").config({ path: ".env" });

async function test(modelName: string) {
  console.log("Testing " + modelName + "...");
  const googleAI = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const start = Date.now();
    const result = await generateText({
      model: googleAI(modelName),
      prompt: "Ahoj",
    });
    console.log(`[${modelName}] Result:`, result.text);
    console.log(`[${modelName}] Time:`, Date.now() - start, "ms");
  } catch (e: any) {
    console.error(`[${modelName}] Error:`, e.message);
  }
}

async function run() {
    await test("gemini-2.5-flash");
    await test("gemini-1.5-flash");
    await test("gemini-2.0-flash");
    process.exit(0);
}

run();
