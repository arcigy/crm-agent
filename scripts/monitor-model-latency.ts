import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import path from "path";

// Load env from root
dotenv.config({ path: path.join(__dirname, "../.env") });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const CURRENT_MODEL = process.env.AI_MODEL_ROUTER || "gemini-2.5-flash";

async function monitorLatency() {
  if (!GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY is missing in .env");
    process.exit(1);
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: CURRENT_MODEL });

  console.log(`[MONITOR] Testing latency for ${CURRENT_MODEL}...`);
  
  const start = Date.now();
  try {
    const result = await model.generateContent("Respond with one word: OK");
    const response = await result.response;
    const text = response.text();
    const elapsed = Date.now() - start;

    console.log(`[MONITOR] Latency: ${elapsed}ms`);
    console.log(`[MONITOR] Response: ${text.trim()}`);

    // Threshold: 6 seconds for a simple ping is a warning, 10s is a failure
    const THRESHOLD_FAIL_MS = 10000;
    const THRESHOLD_WARN_MS = 6000;

    if (elapsed > THRESHOLD_FAIL_MS) {
      console.error(`🔴 [CRITICAL] Model ${CURRENT_MODEL} latency is too high: ${elapsed}ms (Limit: ${THRESHOLD_FAIL_MS}ms)`);
      process.exit(1);
    } else if (elapsed > THRESHOLD_WARN_MS) {
      console.warn(`🟡 [WARNING] Model ${CURRENT_MODEL} is slower than usual: ${elapsed}ms (Warning: ${THRESHOLD_WARN_MS}ms)`);
    } else {
      console.log(`🟢 [HEALTHY] Model ${CURRENT_MODEL} is performing well.`);
    }

  } catch (error: any) {
    console.error(`❌ [ERROR] Failed to call model ${CURRENT_MODEL}:`, error.message);
    process.exit(1);
  }
}

monitorLatency();
