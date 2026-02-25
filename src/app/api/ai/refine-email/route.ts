import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

export async function POST(req: Request) {
  try {
    const { body } = await req.json();
    if (!body) return NextResponse.json({ error: 'Body is required' }, { status: 400 });

    const { text } = await generateText({
      model: google('gemini-2.5-flash'),
      prompt: `Translate or rewrite the following email content to be professional, polite, and clear in Slovak language. Keep the length similar. Respond ONLY with the refined text, no extra commentary.\n\nContent:\n${body}`,
    });

    return NextResponse.json({ refinedBody: text.trim() });
  } catch (error: any) {
    console.error('AI Refine Error:', error);
    return NextResponse.json({ error: 'Failed to refine email' }, { status: 500 });
  }
}
