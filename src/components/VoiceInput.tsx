'use client';

import { useWhisper } from '@chengsokdara/use-whisper';
import { Mic, Square, Loader2 } from 'lucide-react';
import { useEffect } from 'react';

interface VoiceInputProps {
    onTranscription: (text: string) => void;
    className?: string;
}

export function VoiceInput({ onTranscription, className = '' }: VoiceInputProps) {
    const {
        recording,
        transcribing,
        transcript,
        startRecording,
        stopRecording,
    } = useWhisper({
        // We handle transcription manually via our proxy to avoid exposing API key
        onTranscribe: async (blob) => {
            const formData = new FormData();
            formData.append('file', blob, 'audio.wav'); // Filename is important for OpenAI API

            const response = await fetch('/api/ai/whisper', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            return {
                blob,
                text: data.text || '',
            }
        },
        removeSilence: true,
        timeSlice: 1_000,
    });

    // Effect to push transcript to parent when done
    useEffect(() => {
        if (transcript && transcript.text) {
            onTranscription(transcript.text);
        }
    }, [transcript, onTranscription]);

    return (
        <button
            type="button"
            onClick={() => recording ? stopRecording() : startRecording()}
            className={`p-2 rounded-full transition-all ${recording
                    ? 'bg-red-100 text-red-600 animate-pulse hover:bg-red-200'
                    : 'bg-white text-gray-400 hover:bg-gray-100 border border-gray-200 shadow-sm'
                } ${className}`}
            disabled={transcribing}
            title={recording ? "Stop recording" : "Hlasový vstup"}
        >
            {transcribing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
            ) : recording ? (
                <Square className="w-5 h-5 fill-current" />
            ) : (
                <Mic className="w-5 h-5" />
            )}
        </button>
    );
}
