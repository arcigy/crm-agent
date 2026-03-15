import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import directus from "@/lib/directus";
import { createItem } from "@directus/sdk";
import { generateNoteFromPrompt } from "@/app/actions/ai";
import { renderNoteToHtml } from "@/lib/notes-renderer";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    if (!prompt) return NextResponse.json({ success: false, error: "Missing prompt" }, { status: 400 });

    const host = req.headers.get("host") || "";
    const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
    let user = await currentUser();

    if (!user && isLocal) {
      user = { 
        id: 'user_39LUuptq4hAUjFIskaea5cMCbWb', 
        emailAddresses: [{ emailAddress: 'branislav@arcigy.group' }] 
      } as any;
    }

    if (!user || !user.emailAddresses?.[0]?.emailAddress) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = user.emailAddresses[0].emailAddress;

    // 1. Generate content via AI
    const aiResult = await generateNoteFromPrompt(prompt, userEmail);
    
    // 2. Render to HTML
    const htmlContent = renderNoteToHtml(aiResult.blocks);

    // 3. Create the note in DB
    const newNote = await directus.request(
      createItem("crm_notes", {
        title: aiResult.title,
        content: htmlContent,
        user_email: userEmail,
        category: aiResult.category || "idea",
      } as any)
    );

    return NextResponse.json({ success: true, note: newNote });
  } catch (error: any) {
    console.error("AI Note API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
