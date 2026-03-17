"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

export type DrivePathSuggestion = {
  suggestedPath: string;
  reasoning: string;
  confidence: "high" | "medium" | "low";
};

export async function suggestDrivePath(input: {
  filename: string;
  mimeType: string;
  emailSubject: string;
  emailFrom: string;
  emailFromName: string;
  userDescription: string;
  existingFolders?: string[];
}): Promise<DrivePathSuggestion> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-preview-05-14",
  });

  const now = new Date();
  const year = now.getFullYear();

  const prompt = `
You are a file organization AI for a CRM system.
Suggest the best Google Drive folder path for this file.

FILE INFO:
- Filename: ${input.filename}
- Type: ${input.mimeType}
- Email subject: ${input.emailSubject}
- From: ${input.emailFromName} <${input.emailFrom}>
- User description: ${input.userDescription || "none provided"}

EXISTING DRIVE FOLDERS (if available):
${input.existingFolders?.join("\n") || "not fetched"}

RULES FOR PATH SUGGESTION:
- Use Slovak folder names to match CRM language
- Max 3 levels deep: Category/Subcategory/Detail
- Common categories: Faktúry, Zmluvy, Klienti, Projekty, Fotografie, Prezentácie, Správy, Ostatné
- If filename contains "faktur" → suggest Faktúry/${year}/[Month in Slovak]
- If filename contains "zmluv" or "kontrakt" → Zmluvy/${year}
- If image → Fotografie/${year}/[Month in Slovak]
- Always include current year when relevant

Respond ONLY with valid JSON, no markdown:
{
  "suggestedPath": "Faktúry/${year}/Marec",
  "reasoning": "Súbor obsahuje 'faktura' v názve a bol prijatý v marci ${year}",
  "confidence": "high"
}
`;

  try {
    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean) as Partial<DrivePathSuggestion>;

    const suggestedPath =
      typeof parsed.suggestedPath === "string" && parsed.suggestedPath.trim()
        ? parsed.suggestedPath.trim().replace(/^\/+/, "").replace(/\/+$/, "")
        : `Ostatné/${year}`;

    const confidence =
      parsed.confidence === "high" || parsed.confidence === "medium" || parsed.confidence === "low"
        ? parsed.confidence
        : "low";

    return {
      suggestedPath,
      reasoning:
        typeof parsed.reasoning === "string" && parsed.reasoning.trim()
          ? parsed.reasoning.trim()
          : "Automatická kategorizácia prebehla bez vysvetlenia.",
      confidence,
    };
  } catch (e: any) {
    console.error("[Drive AI Path] Suggestion failed:", e?.message || e);
    return {
      suggestedPath: `Ostatné/${year}`,
      reasoning: "Automatická kategorizácia zlyhala.",
      confidence: "low",
    };
  }
}

