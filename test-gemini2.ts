const { createGoogleGenerativeAI } = require("@ai-sdk/google");
const { generateText } = require("ai");
require("dotenv").config({ path: ".env" });

async function test() {
  console.log("Testing gemini-flash-latest...");
  const googleAI = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const start = Date.now();
    const result = await generateText({
      model: googleAI("gemini-flash-latest"),
      prompt: "Ahoj",
    });
    console.log("Result:", result.text);
    console.log("Time:", Date.now() - start, "ms");
  } catch (e: any) {
    console.error("Error with gemini-flash-latest:", e.message);
  }
}

test();
