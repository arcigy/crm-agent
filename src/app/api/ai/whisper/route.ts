import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // OpenAI library needs specific object format or File object
        // Since we are in Node environment (server), we pass the file directly if standard Request is used,
        // but typically OpenAI SDK accepts ReadStream or File-like object.
        // In Next.js 13+, FormData entry is a Blob/File which is compatible.

        const response = await openai.audio.transcriptions.create({
            file: file,
            model: 'whisper-1',
            language: 'sk', // Default to Slovak based on user language, or 'en'
        });

        return NextResponse.json({ text: response.text });

    } catch (error: any) {
        console.error('Whisper API Error:', error);
        return NextResponse.json({ error: error.message || 'Transcription failed' }, { status: 500 });
    }
}
