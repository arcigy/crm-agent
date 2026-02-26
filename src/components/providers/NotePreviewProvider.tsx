'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { X, FileText, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface Note {
  id: string | number;
  title: string;
  content: string;
  date_created: string;
}

interface NotePreviewContextType {
  openNote: (id: string | number) => void;
  closeNote: () => void;
}

const NotePreviewContext = createContext<NotePreviewContextType | undefined>(undefined);

export function useNotePreview() {
  const context = useContext(NotePreviewContext);
  if (!context) {
    throw new Error('useNotePreview must be used within a NotePreviewProvider');
  }
  return context;
}

export function NotePreviewProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [note, setNote] = useState<Note | null>(null);

  const openNote = async (id: string | number) => {
    setIsOpen(true);
    setIsLoading(true);
    setNote(null);

    try {
      const { executeDbNoteTool } = await import('@/app/actions/executors-notes');
      const result = await executeDbNoteTool('db_get_note', { note_id: id }, undefined);
      
      if (result.success && result.data) {
        setNote(result.data as any);
      } else {
        toast.error('Poznámka sa nenašla.');
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Failed to fetch note:', error);
      toast.error('Nepodarilo sa načítať poznámku.');
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const closeNote = () => setIsOpen(false);

  return (
    <NotePreviewContext.Provider value={{ openNote, closeNote }}>
      {children}
      
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
          <div
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            onClick={closeNote}
          />

          <div className="bg-[#0f1115] w-full max-w-2xl max-h-[85vh] rounded-[2rem] border border-violet-900/30 shadow-2xl shadow-violet-900/20 relative flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-5 duration-300">
            {/* Header */}
            <div className="p-6 border-b border-violet-900/20 flex items-center justify-between bg-violet-900/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center border border-violet-500/30">
                  <FileText className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white tracking-tight">
                    {isLoading ? 'Načítavam...' : note?.title || 'Detail poznámky'}
                  </h3>
                  {note && (
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1 text-[10px] uppercase font-black tracking-widest text-violet-400/60">
                        <Calendar className="w-3 h-3" />
                        {new Date(note.date_created).toLocaleDateString('sk-SK')}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] uppercase font-black tracking-widest text-violet-400/60">
                        <Clock className="w-3 h-3" />
                        {new Date(note.date_created).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={closeNote}
                className="p-2 transition-all rounded-xl border border-white/5 hover:border-white/10 hover:bg-white/10 text-white/40 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {isLoading ? (
                <div className="space-y-4 animate-pulse">
                  <div className="h-4 bg-white/5 rounded-full w-full" />
                  <div className="h-4 bg-white/5 rounded-full w-5/6" />
                  <div className="h-4 bg-white/5 rounded-full w-4/6" />
                  <div className="h-4 bg-white/5 rounded-full w-full" />
                  <div className="h-4 bg-white/5 rounded-full w-2/3" />
                </div>
              ) : note ? (
                <div 
                  className="prose prose-invert prose-violet max-w-none 
                    prose-p:text-gray-300 prose-p:leading-relaxed prose-p:text-[15px]
                    prose-strong:text-white prose-strong:font-bold
                    prose-headings:text-violet-100 prose-headings:font-black prose-headings:tracking-tight
                    prose-ul:list-disc prose-li:text-gray-400"
                  dangerouslySetInnerHTML={{ __html: note.content }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <FileText className="w-12 h-12 mb-4 opacity-10" />
                  <p className="text-sm font-medium">Poznámku sa nepodarilo načítať.</p>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-violet-900/20 bg-violet-900/5 flex justify-end">
              <button
                onClick={closeNote}
                className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all shadow-lg shadow-violet-600/20"
              >
                Zavrieť
              </button>
            </div>
          </div>
        </div>
      )}
    </NotePreviewContext.Provider>
  );
}

