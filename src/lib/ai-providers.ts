/**
 * Multi-Provider AI Abstraction Layer
 *
 * Konfigurácia modelov:
 * - Gatekeeper: GPT-4o-mini (rýchla extrakcia)
 * - Orchestrator: Claude 3.5 Sonnet (najlepší tool-use)
 * - Verifier: Gemini 1.5 Flash (rýchly, overenie)
 * - Final Report: Gemini 1.5 Flash (stručný report)
 */

import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

// === PROVIDER INSTANCES ===

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// === MODEL CONFIGURATION ===

export const AI_MODELS = {
  GATEKEEPER: process.env.AI_MODEL_GATEKEEPER || "gpt-4o-mini",
  ORCHESTRATOR: process.env.AI_MODEL_ORCHESTRATOR || "claude-3-5-sonnet-20241022",
  VERIFIER: process.env.AI_MODEL_VERIFIER || "gemini-1.5-flash",
  REPORT: process.env.AI_MODEL_REPORT || "gemini-1.5-flash",
  EMAIL_CLASSIFIER: process.env.AI_MODEL_CLASSIFIER || "claude-3-5-sonnet-20241022",
  ROUTER: process.env.AI_MODEL_ROUTER || "gemini-1.5-flash",
  PREPARER: process.env.AI_MODEL_PREPARER || "gemini-1.5-flash",
} as const;

// === UNIFIED RESPONSE TYPE ===

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface AIResponse {
  content: string;
  model: string;
  provider: "openai" | "anthropic" | "gemini";
}

// === GATEKEEPER (OpenAI GPT-5 Nano / GPT-4o-mini fallback) ===

export async function callGatekeeper(
  systemPrompt: string,
  messages: { role: string; content: string }[],
): Promise<{
  intent: string;
  reason: string;
  extracted_data: Record<string, unknown>;
}> {
  const response = await openai.chat.completions.create({
    model: AI_MODELS.GATEKEEPER,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ],
    response_format: { type: "json_object" },
    temperature: 0,
  });

  return JSON.parse(response.choices[0].message.content || "{}");
}

// === ORCHESTRATOR (Claude 3.7 Sonnet) ===

export async function callOrchestrator(
  systemPrompt: string,
  userMessage: string,
): Promise<{ plan: Record<string, unknown>[]; readable_plan: string[] }> {
  const response = await anthropic.messages.create({
    model: AI_MODELS.ORCHESTRATOR,
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `${systemPrompt}\n\nPoužívateľova požiadavka: ${userMessage}`,
      },
    ],
  });

  const textContent = response.content.find((c) => c.type === "text");
  const text = textContent?.type === "text" ? textContent.text : "{}";

  // Parse JSON from Claude response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }

  return { plan: [], readable_plan: [] };
}

// === VERIFIER (Gemini 1.5 Flash) ===

export async function callVerifier(
  toolResults: Record<string, unknown>[],
): Promise<{ success: boolean; analysis: string }> {
  const model = gemini.getGenerativeModel({ model: AI_MODELS.VERIFIER });

  const prompt = `Si Mission Verifier. Analyzuj tieto výsledky a urči, či bola misia úspešná.

Výsledky nástrojov:
${JSON.stringify(toolResults, null, 2)}

Odpovedaj LEN v JSON formáte:
{ "success": true/false, "analysis": "krátka analýza" }`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }

  return { success: false, analysis: "Nemožno analyzovať" };
}

// === FINAL REPORT (Gemini 1.5 Flash) ===

export async function callFinalReport(
  messages: { role: string; content: string }[],
  toolResults: Record<string, unknown>[],
): Promise<string> {
  const model = gemini.getGenerativeModel({ model: AI_MODELS.REPORT });

  const userMessages = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("\n");

  const prompt = `Zhrň výsledok misie priamo a stručne v jednej-dvoch vetách pre používateľa.

Pôvodná požiadavka používateľa:
${userMessages}

Výsledky vykonaných akcií:
${JSON.stringify(toolResults, null, 2)}

Odpovedaj priamo, bez JSON formátu. Buď priateľský a profesionálny.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

// === CONVERSATIONAL (Claude for simple Q&A) ===

export async function callConversational(
  systemPrompt: string,
  messages: { role: string; content: string }[],
): Promise<string> {
  const response = await anthropic.messages.create({
    model: AI_MODELS.ORCHESTRATOR, // Using same model for consistency
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  });

  const textContent = response.content.find((c) => c.type === "text");
  return textContent?.type === "text" ? textContent.text : "";
}

// === EMAIL CLASSIFIER (Claude) ===

export async function callEmailClassifier(
  prompt: string,
): Promise<Record<string, unknown> | null> {
  const response = await anthropic.messages.create({
    model: AI_MODELS.EMAIL_CLASSIFIER,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const textContent = response.content.find((c) => c.type === "text");
  const text = textContent?.type === "text" ? textContent.text : "{}";

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }

  return null;
}
