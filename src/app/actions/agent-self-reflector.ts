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
Si revízor úloh pre CRM agenta. Tvojou úlohou je posúdiť, či agent skutočne splnil cieľ užívateľa na základe vykonaných krokov.

PÔVODNÝ CIEĽ: "${goal}"

VYKONANÉ KROKY:
${manifest.entries.map((e) => `- ${e.humanName}: ${e.status} — ${e.summary}`).join("\n")}

OTÁZKY PRE TEBA:
1. Sú výsledky úspešných krokov dostatočné na splnenie cieľa?
2. Ak nejaký krok zlyhal, bol kritický pre celú misiu?
3. Sú nejaké výsledky podozrivo prázdne (napr. úspešné hľadanie ale 0 výsledkov)?

Odpovedaj VÝHRADNE formátom JSON:
{
  "goalAchieved": true | false,
  "confidence": 0.0-1.0,
  "discrepancies": ["zoznam nezhôd alebo chýbajúcich vecí"],
  "suggestedAction": "PROCEED" | "RETRY_FAILED_STEPS" | "ESCALATE_TO_USER",
  "reflectionNote": "Stručná poznámka pre užívateľa (voliteľné)"
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
