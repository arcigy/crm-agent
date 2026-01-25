'use client';

import { useEffect, useState, useRef } from 'react';
import { useWhisper } from '@chengsokdara/use-whisper';
import { Mic, Loader2, Square } from 'lucide-react';

export function VoiceDictationProvider({ children }: { children: React.ReactNode }) {
    const [activeInput, setActiveInput] = useState<HTMLElement | null>(null);
    const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);
    // Keep track if we are interacting with the mic to prevent hiding
    const isInteractingWithMic = useRef(false);

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

    const updatePosition = (target: HTMLElement) => {
        const rect = target.getBoundingClientRect();
        // Recalculate position relative to viewport + scroll
        setButtonPosition({
            top: rect.top + window.scrollY + (rect.height / 2) - 16,
            left: rect.right + window.scrollX + 8
        });
    };

    useEffect(() => {
        const handleFocus = (e: FocusEvent) => {
            const target = e.target as HTMLElement;

            // Filter eligible inputs
            if (!target ||
                (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') ||
                (target as HTMLInputElement).readOnly ||
                (target as HTMLInputElement).disabled ||
                (target as HTMLInputElement).type === 'password' ||
                (target as HTMLInputElement).type === 'hidden' ||
                target.getAttribute('aria-hidden') === 'true'
            ) {
                return;
            }

            console.log('🎙️ Dictation available for:', target.tagName);
            updatePosition(target);
            setActiveInput(target);
        };

        const handleBlur = (e: FocusEvent) => {
            // If the blur was caused by clicking our mic button, IGNORE IT.
            // But usually relatedTarget is null on specific browsers if clicking non-focusable elements.
            // relies on isInteractingWithMic ref

            setTimeout(() => {
                if (isInteractingWithMic.current || recording) {
                    console.log('🎙️ Retaining focus due to interaction/recording');
                    return;
                }
                setActiveInput(null);
            }, 300); // verify logic
        };

        // Also handle scrolling to update position
        const handleScroll = () => {
            if (activeInput) updatePosition(activeInput);
        };

        window.addEventListener('focusin', handleFocus);
        window.addEventListener('focusout', handleBlur); // focusout bubbles, blur doesn't
        window.addEventListener('scroll', handleScroll, true);

        return () => {
            window.removeEventListener('focusin', handleFocus);
            window.removeEventListener('focusout', handleBlur);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [recording, activeInput]);

    // Insert text
    useEffect(() => {
        if (transcript && transcript.text && activeInput) {
            const input = activeInput as HTMLInputElement | HTMLTextAreaElement;
            const start = input.selectionStart || input.value.length;
            const end = input.selectionEnd || input.value.length;
            const text = " " + transcript.text; // Add space

            const newValue = input.value.substring(0, start) + text + input.value.substring(end);

            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
            const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;

            if (input.tagName === 'INPUT' && nativeInputValueSetter) {
                nativeInputValueSetter.call(input, newValue);
            } else if (input.tagName === 'TEXTAREA' && nativeTextAreaValueSetter) {
                nativeTextAreaValueSetter.call(input, newValue);
            } else {
                input.value = newValue;
            }

            input.dispatchEvent(new Event('input', { bubbles: true }));
            // Keep focus?
            input.focus();
            // input.setSelectionRange(start + text.length, start + text.length);
        }
    }, [transcript, activeInput]);

    return (
        <>
            {children}
            {/* Render Overlay Button using Portal-like fixed positioning */}
            {activeInput && (
                <button
                    ref={buttonRef}
                    type="button"
                    onMouseEnter={() => { isInteractingWithMic.current = true; }}
                    onMouseLeave={() => { isInteractingWithMic.current = false; }}
                    onMouseDown={(e) => {
                        e.preventDefault(); // CRITICAL: Prevents input blur
                        isInteractingWithMic.current = true;
                    }}
                    onClick={() => {
                        // Toggle recording
                        if (recording) stopRecording();
                        else {
                            startRecording();
                            // Keep input focused so user sees the context
                            activeInput.focus();
                        }
                    }}
                    style={{
                        position: 'absolute',
                        top: buttonPosition.top,
                        left: buttonPosition.left,
                        zIndex: 100000, // Top of everything
                        transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}
                    className={`
                        flex items-center justify-center
                        w-8 h-8 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.1)] border 
                        ${recording
                            ? 'bg-red-500 text-white border-red-600 scale-110 shadow-red-200'
                            : 'bg-white text-gray-400 border-gray-100 hover:text-indigo-600 hover:border-indigo-200 hover:shadow-indigo-100 hover:scale-105'
                        }
                    `}
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
