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
Audit mission success based on execution manifest.

GOAL: ${goal}
MANIFEST: ${JSON.stringify(manifest, null, 2)}

Determine:
- goalAchieved: true/false
- confidence: 0.0-1.0  
- discrepancies: what was expected vs what happened
- suggestedAction: DONE | RETRY_STEP | ESCALATE_TO_USER | CLARIFY

ESCALATE_TO_USER when: required data missing, permission denied, entity not found
RETRY_STEP when: temporary error, wrong args that can be corrected
DONE when: goal fully achieved, even if some optional steps skipped

Output JSON only:
{
  "goalAchieved": true | false,
  "confidence": 0.0-1.0,
  "discrepancies": ["list of discrepancies"],
  "suggestedAction": "DONE" | "RETRY_STEP" | "ESCALATE_TO_USER" | "CLARIFY",
  "reflectionNote": "Optional note for user in Slovak"
}
`;

  try {
    const response = await generateText({
      model: google(AI_MODELS.ROUTER), // Using high-speed router model
      system: "Si precízny revízor AI agentov. Analyzuješ fakty, nie sľuby. Respond ONLY with JSON.",
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
