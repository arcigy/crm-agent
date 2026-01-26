import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Move initialization inside handler to prevent build-time errors if env vars are missing
// const openai = new OpenAI({...}); <--- BAD for build time

export async function POST(request: Request) {
    try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY is not set');
        }

        const openai = new OpenAI({
            apiKey: apiKey,
        });

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // OpenAI library needs specific object format or File object
        const response = await openai.audio.transcriptions.create({
            file: file,
            model: 'whisper-1',
            language: 'sk',
        });

        return NextResponse.json({ text: response.text });

    } catch (error: any) {
        console.error('Whisper API Error:', error);
        return NextResponse.json({ error: error.message || 'Transcription failed' }, { status: 500 });
    }
}
