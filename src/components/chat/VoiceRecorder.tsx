'use client';

import React, { useState, useRef } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { transcribeAudio } from '@/app/actions/ai';
import { toast } from 'sonner';

interface VoiceRecorderProps {
  onTranscription: (text: string) => void;
  isProcessing: boolean;
  setIsProcessing: (val: boolean) => void;
}

export function VoiceRecorder({ onTranscription, isProcessing, setIsProcessing }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(24).fill(15));
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Determine best semi-compatible format
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(',')[1];
          setIsProcessing(true);
          try {
            const text = await transcribeAudio(base64);
            if (text) {
              onTranscription(text);
            } else {
              toast.error("Nepodarilo sa zachytiť žiadnu reč.");
            }
          } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Chyba pri prepise zvuku.");
          } finally {
            setIsProcessing(false);
          }
        };
        stream.getTracks().forEach(track => track.stop());
      };

      // Audio Visualization logic
      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      const audioContext = new AudioContextClass();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateLevels = () => {
        analyser.getByteFrequencyData(dataArray);
        // Take a slice of the middle frequencies for a nice look
        const avg = Array.from(dataArray).reduce((a, b) => a + b, 0) / bufferLength;
        const normalized = Math.min(100, Math.max(15, (avg / 255) * 100 * 1.5));
        
        setAudioLevels(prev => {
          const next = [...prev.slice(1), normalized];
          return next;
        });
        animationFrameRef.current = requestAnimationFrame(updateLevels);
      };
      updateLevels();

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Error starting recording:', err);
      toast.error("Prístup k mikrofónu bol zamietnutý.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center">
      {isRecording ? (
        <div className="flex items-center gap-3 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl animate-in fade-in slide-in-from-right-2 duration-300">
          <div className="flex items-center gap-[2px] h-6 w-32">
            {audioLevels.map((lvl, i) => (
              <div 
                key={i} 
                className="w-1 bg-emerald-500 rounded-full transition-all duration-75"
                style={{ height: `${lvl}%` }}
              />
            ))}
          </div>
          <span className="text-xs font-mono text-emerald-400 tabular-nums min-w-[32px]">{formatTime(recordingTime)}</span>
          <button 
            onClick={stopRecording}
            className="p-2 bg-emerald-600 hover:bg-emerald-500 rounded-full text-white transition-colors shadow-lg shadow-emerald-500/20"
          >
            <Square size={12} fill="currentColor" />
          </button>
        </div>
      ) : (
        <button
          onClick={startRecording}
          disabled={isProcessing}
          type="button"
          className={`p-3 bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-emerald-500 rounded-2xl transition-all border border-gray-800 hover:border-emerald-500/50 shadow-md flex items-center justify-center ${isProcessing ? 'animate-pulse' : ''}`}
          title="Nahrať hlasovú správu"
        >
          {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
        </button>
      )}
    </div>
  );
}
