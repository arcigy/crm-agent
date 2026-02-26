import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { AI_MODELS } from "@/lib/ai-providers";
import { ExecutionManifest } from "./agent-manifest-builder";

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ReflectionResult {
  goalAchieved: boolean;
  confidence: number;
  discrepancies: string[];
  suggestedAction: "PROCEED" | "RETRY_FAILED_STEPS" | "ESCALATE_TO_USER";
  reflectionNote?: string;
}

/**
 * Self-Reflection Step: Audits whether the agent actually completed the goal.
 * Runs after the orchestrator loop but before the verifier.
 */
export async function selfReflect(
  goal: string,
  manifest: ExecutionManifest
): Promise<ReflectionResult> {
  const tag = "[SELF-REFLECTOR]";

  // optimization: skip reflection for simple success chains
  if (manifest.totalSteps <= 2 && manifest.failCount === 0) {
    return {
      goalAchieved: true,
      confidence: 1.0,
      discrepancies: [],
      suggestedAction: "PROCEED",
    };
  }

  const prompt = `
Audit achieving the goal based on the execution manifest.
Determine if reached, partially, or failed.
Suggest the next best action.

GOAL: ${goal}
MANIFEST: ${JSON.stringify(manifest, null, 2)}

Output JSON:
{
  "goalAchieved": true | false,
  "confidence": 0.0-1.0,
  "discrepancies": ["brief explanation in Slovak"],
  "suggestedAction": "PROCEED" | "RETRY_FAILED_STEPS" | "ESCALATE_TO_USER"
}
`;

  try {
    const response = await generateText({
      model: google(AI_MODELS.ROUTER), 
      system: "Audit achieving the goal based on the execution manifest. Determine if reached, partially, or failed. Suggest the next best action.",
      prompt,
      temperature: 0,
    });

    const raw = response.text || "";
    const startIdx = raw.indexOf("{");
    const endIdx = raw.lastIndexOf("}");
    
    if (startIdx === -1) {
      console.warn(`${tag} No JSON in response.`);
      return { goalAchieved: true, confidence: 0.5, discrepancies: [], suggestedAction: "PROCEED" };
    }

    const result = JSON.parse(raw.substring(startIdx, endIdx + 1)) as ReflectionResult;
    console.log(`${tag} Goal achieved: ${result.goalAchieved}, Decision: ${result.suggestedAction}`);
    
    return result;
  } catch (error: any) {
    console.error(`${tag} Critical Error: ${error.message}`);
    return {
      goalAchieved: true,
      confidence: 0.5,
      discrepancies: ["Chyba pri reflexii"],
      suggestedAction: "PROCEED",
    };
  }
}
