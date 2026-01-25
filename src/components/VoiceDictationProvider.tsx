'use client';

import { useEffect, useState, useRef } from 'react';
import { useWhisper } from '@chengsokdara/use-whisper';
import { Mic, Loader2, Square } from 'lucide-react';

export function VoiceDictationProvider({ children }: { children: React.ReactNode }) {
    const [activeInput, setActiveInput] = useState<HTMLElement | null>(null);
    const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Whisper Logic
    const {
        recording,
        transcribing,
        transcript,
        startRecording,
        stopRecording,
    } = useWhisper({
        onTranscribe: async (blob) => {
            const formData = new FormData();
            formData.append('file', blob, 'audio.wav');
            const res = await fetch('/api/ai/whisper', { method: 'POST', body: formData });
            const data = await res.json();
            return { blob, text: data.text || '' };
        },
        removeSilence: true,
    });

    // 1. Listen for focus events application-wide
    useEffect(() => {
        const handleFocus = (e: FocusEvent) => {
            const target = e.target as HTMLElement;
            // Ignore if not input/textarea or if it's read-only/disabled
            if (!target ||
                (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') ||
                (target as HTMLInputElement).readOnly ||
                (target as HTMLInputElement).disabled ||
                (target as HTMLInputElement).type === 'password' ||
                (target as HTMLInputElement).type === 'file'
            ) {
                // Keep active if we are clicking the mic button itself
                if (buttonRef.current && buttonRef.current.contains(e.relatedTarget as Node)) {
                    return;
                }
                // Don't hide immediately to allow clicking the button
                // Let the blur handler decide or click handler
                return;
            }

            // Position the button
            const rect = target.getBoundingClientRect();
            setButtonPosition({
                top: rect.top + window.scrollY + (rect.height / 2) - 16, // Vertically centered
                left: rect.right + window.scrollX + 8 // 8px to the right
            });
            setActiveInput(target);
        };

        const handleBlur = (e: FocusEvent) => {
            // If we click the mic button, don't hide
            if (buttonRef.current && buttonRef.current.contains(e.relatedTarget as Node)) {
                return;
            }
            // Small delay to allow interaction
            setTimeout(() => {
                if (!recording) { // Don't hide while recording
                    setActiveInput(null);
                }
            }, 200);
        };

        document.addEventListener('focusin', handleFocus);
        document.addEventListener('focusout', handleBlur);

        return () => {
            document.removeEventListener('focusin', handleFocus);
            document.removeEventListener('focusout', handleBlur);
        };
    }, [recording]);

    // 2. Insert text when transcription is ready
    useEffect(() => {
        if (transcript && transcript.text && activeInput) {
            const input = activeInput as HTMLInputElement | HTMLTextAreaElement;

            // Insert at cursor position or append
            const start = input.selectionStart || input.value.length;
            const end = input.selectionEnd || input.value.length;

            const text = transcript.text;
            const newValue = input.value.substring(0, start) + text + input.value.substring(end);

            // Set native value setter for React to detect change
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype,
                "value"
            )?.set;
            const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLTextAreaElement.prototype,
                "value"
            )?.set;

            if (input.tagName === 'INPUT' && nativeInputValueSetter) {
                nativeInputValueSetter.call(input, newValue);
            } else if (input.tagName === 'TEXTAREA' && nativeTextAreaValueSetter) {
                nativeTextAreaValueSetter.call(input, newValue);
            } else {
                input.value = newValue;
            }

            // Dispatch input event so React state updates
            input.dispatchEvent(new Event('input', { bubbles: true }));

            // Move cursor end
            const newCursorPos = start + text.length;
            input.setSelectionRange(newCursorPos, newCursorPos);
        }
    }, [transcript, activeInput]);

    return (
        <>
            {children}
            {activeInput && (
                <button
                    ref={buttonRef}
                    type="button"
                    // Prevent stealing focus from input
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => recording ? stopRecording() : startRecording()}
                    style={{
                        position: 'absolute',
                        top: buttonPosition.top,
                        left: buttonPosition.left,
                        zIndex: 9999
                    }}
                    className={`p-1.5 rounded-full shadow-md transition-all border ${recording
                            ? 'bg-red-600 text-white border-red-700 animate-pulse scale-110'
                            : 'bg-white text-gray-400 border-gray-200 hover:text-blue-600 hover:border-blue-300'
                        }`}
                >
                    {transcribing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : recording ? (
                        <Square className="w-3 h-3 fill-current" />
                    ) : (
                        <Mic className="w-4 h-4" />
                    )}
                </button>
            )}
        </>
    );
}
