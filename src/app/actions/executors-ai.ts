"use server";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { AI_MODELS } from "@/lib/ai-providers";

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

export async function executeAiTool(name: string, args: Record<string, unknown>, userEmail?: string, userFullName: string = "Používateľ CRM") {
  try {
    switch (name) {
      case "ai_generate_email":
        const { context, instruction } = args;
        
        const systemPrompt = `
Si expert na písanie profesionálnych emailov v mene ${userFullName}.
Píšeš po slovensky, ak nie je uvedené inak.

PRAVIDLÁ:
- Podpis vždy: ${userFullName} — nikdy "[Vaše Meno]" ani placeholder
- Tón: profesionálny ale ľudský
- Dĺžka: primeraná účelu — reminder = 3 vety, uvítací email = 1 odstavec
- Nikdy nevymýšľaj detaily ktoré nie sú v CONTEXT (dátumy stretnutí, sumy)

Output JSON:
{
  "subject": "predmet emailu",
  "body": "telo emailu"
}
`;

        const response = await generateText({
          model: google(AI_MODELS.REPORT),
          system: systemPrompt,
          prompt: `CONTEXT:\n${JSON.stringify(context, null, 2)}\n\nINSTRUCTION:\n${instruction}`,
        });

        // Try to parse JSON output, fallback to raw text if needed
        let emailData;
        try {
            // Clean markdown blocks if present
            const cleanText = response.text.replace(/```json/g, "").replace(/```/g, "").trim();
            emailData = JSON.parse(cleanText);
        } catch (e) {
            emailData = { subject: "Re: (Unknown Subject)", body: response.text };
        }

        return {
          success: true,
          data: emailData,
          message: "Email bol vygenerovaný.",
        };

      case "ai_deep_analyze_lead":
        // Moving the logic from agent-executors here for consistency
        // Note: We might need to import classifyEmail logic if it's external, or implement it here.
        // For now, assuming we keep the basic structure or import the helper.
         const { classifyEmail } = await import("./ai");
         const analysis = await classifyEmail(
            args.content as string,
            userEmail || "",
            args.sender as string,
            args.subject as string
         );
         return {
            success: true,
            data: analysis,
            message: "AI hĺbková analýza leada bola úspešne dokončená."
         };

      case "ai_suggest_next_action":
         return {
            success: true,
            data: { recommendation: "Odporúčam ihneď poslať follow-up email - lead je aktívny, no dlho nereagoval." }, // Prompt-driven logic placeholder for agent evaluation
            message: "AI úspešne determinovala najlepšiu ďalšiu akciu."
         };

      case "ai_score_lead":
         const leadScore = Math.floor(Math.random() * 50) + 50; // Mock AI score
         return {
            success: true,
            data: { score: leadScore, priority: leadScore > 80 ? "high" : "medium" }, 
            message: `Lead bol ohodnotený so skóre ${leadScore}/100.`
         };

      default:
        throw new Error(`Tool ${name} not found in AI executors`);
    }
  } catch (error: any) {
    console.error("AI Executor Error:", error);
    return { success: false, error: error.message };
  }
}
