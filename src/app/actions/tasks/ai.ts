"use server";

import { callModel } from "@/lib/ai-providers";
import { getUserEmail } from "@/lib/auth";

export async function generateTaskTitleFromEmail(
  subject: string,
  body: string,
  senderName: string
) {
  try {
    const email = await getUserEmail();
    if (!email) return { success: false as const, error: "Unauthorized" };

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "missing-gemini-key") {
      console.warn("AI Key mission. Faling back to default title.");
      return { 
        success: true as const, 
        title: `Odpovedať na e-mail: ${subject}`,
        isFallback: true 
      };
    }

    const prompt = `Si AI asistent pre manažment úloh (To-Do). 
Tvojou úlohou je prečítať si e-mail od klienta a vygenerovať k nemu STRUČNÝ, JASNÝ a AKČNÝ názov úlohy v slovenčine.
Názov by mal vyjadrovať, čo treba s týmto e-mailom urobiť (napríklad: "Odpovedať na cenovú ponuku", "Spracovať zmluvu od klienta", "Zavolať ohľadom detailov projektu"). 
Ak to nie je jasné, aspoň zhrň hlavnú podstatu do krátkeho názvu.
Zadávateľ úlohy bude samotný obchodník.

DETAILY E-MAILU:
Odosielateľ: ${senderName}
Predmet: ${subject}
Obsah textu (prvých 1000 znakov):
${body.substring(0, 1000)}

Pravidlá pre výstup:
- Maximálna dĺžka: 7-10 slov.
- Musí obsahovať meno klienta, ak je z kontextu zrejmé, inak použi "${senderName}".
- Vráť IBA čistý vygenerovaný text názvu úlohy, bez úvodzoviek, bez odrážok, bez iných komentárov.`;

    const generatedTitle = await callModel(prompt, { temperature: 0.3, maxTokens: 100 });
    
    return {
      success: true as const,
      title: generatedTitle.trim(),
    };
  } catch (error: any) {
    console.error("Generate Task Title Error Detail:", {
      message: error?.message,
      stack: error?.stack,
      code: error?.code,
      status: error?.status
    });
    return {
      success: false as const,
      error: error?.message || "Nepodarilo sa vygenerovať názov",
    };
  }
}
