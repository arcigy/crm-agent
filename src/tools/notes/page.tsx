'use client';

import * as React from 'react';
import { Plus, Trash2, FileText, Search, Loader2, X, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Note {
    id: string;
    title: string;
    content: string;
    date_created: string;
}

export default function NotesTool() {
    const [notes, setNotes] = React.useState<Note[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [selectedNote, setSelectedNote] = React.useState<Note | null>(null);
    const [isSaving, setIsSaving] = React.useState(false);

    const fetchNotes = async () => {
        try {
            const res = await fetch('/api/notes');
            const data = await res.json();
            if (Array.isArray(data)) {
                setNotes(data);
            }
        } catch (error) {
            toast.error('Nepodarilo sa načítať poznámky');
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchNotes();
    }, []);

    const createNote = async () => {
        try {
            const res = await fetch('/api/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: 'Nová poznámka', content: '' })
            });

            if (res.ok) {
                const newNote = await res.json();
                setNotes([newNote, ...notes]);
                setSelectedNote(newNote);
            }
        } catch (error) {
            toast.error('Chyba pri vytváraní');
        }
    };

    const saveNote = async (id: string, title: string, content: string) => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/notes', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, title, content })
            });

            if (res.ok) {
                setNotes(notes.map(n => n.id === id ? { ...n, title, content } : n));
            }
        } catch (error) {
            toast.error('Chyba pri ukladaní');
        } finally {
            setIsSaving(false);
        }
    };

    const deleteNote = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setNotes(notes.filter(n => n.id !== id));
        if (selectedNote?.id === id) setSelectedNote(null);

        try {
            const res = await fetch(`/api/notes?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error();
        } catch (error) {
            fetchNotes();
            toast.error('Chyba pri mazaní');
        }
    };

    const filteredNotes = notes.filter(n =>
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="h-[calc(100vh-160px)] flex flex-col space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic">
                        Notes / <span className="text-blue-600">Ideas</span>
                    </h1>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mt-2 opacity-60">Collect your thoughts</p>
                </div>
                <div className="flex gap-4">
                    <div className="relative w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Hľadať..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-blue-200 transition-all shadow-sm"
                        />
                    </div>
                    <button
                        onClick={createNote}
                        className="bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl active:scale-95 transition-all"
                    >
                        <Plus className="w-4 h-4" /> Nová
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex gap-8 overflow-hidden">
                {/* Scrollable Sidebar/Grid */}
                <div className="w-1/3 overflow-y-auto pr-2 custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center p-20">
                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredNotes.map(note => (
                                <div
                                    key={note.id}
                                    onClick={() => setSelectedNote(note)}
                                    className={`p-6 rounded-[2rem] border transition-all cursor-pointer group relative overflow-hidden ${selectedNote?.id === note.id ? 'bg-blue-600 text-white border-blue-600 shadow-xl shadow-blue-100' : 'bg-white text-gray-900 border-gray-50 hover:border-blue-200 hover:shadow-lg'}`}
                                >
                                    <h3 className="text-xl font-black tracking-tight mb-2 truncate">{note.title || 'Bez názvu'}</h3>
                                    <p className={`text-[11px] font-medium leading-relaxed line-clamp-2 ${selectedNote?.id === note.id ? 'text-blue-100' : 'text-gray-400'}`}>
                                        {note.content || 'Žiadny text...'}
                                    </p>
                                    <button
                                        onClick={(e) => deleteNote(e, note.id)}
                                        className={`absolute top-4 right-4 p-2 rounded-xl transition-all opacity-0 group-hover:opacity-100 ${selectedNote?.id === note.id ? 'hover:bg-blue-500' : 'hover:bg-red-50 hover:text-red-500'}`}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Editor Content */}
                <div className="flex-1 bg-white rounded-[4rem] border border-gray-100 shadow-[0_50px_150px_rgba(0,0,0,0.03)] p-12 flex flex-col relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-indigo-600"></div>

                    {selectedNote ? (
                        <>
                            <div className="flex items-center justify-between mb-8">
                                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-300">Editor Workspace</span>
                                <div className="flex items-center gap-2">
                                    {isSaving && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
                                    <span className="text-[10px] font-black uppercase text-blue-500">{isSaving ? 'Ukladám' : 'Synchnuté'}</span>
                                </div>
                            </div>
                            <input
                                className="text-5xl font-black tracking-tighter text-gray-900 mb-8 outline-none placeholder:text-gray-100"
                                value={selectedNote.title}
                                onChange={(e) => {
                                    const newTitle = e.target.value;
                                    setSelectedNote({ ...selectedNote, title: newTitle });
                                    saveNote(selectedNote.id, newTitle, selectedNote.content);
                                }}
                                placeholder="Titulok..."
                            />
                            <textarea
                                className="flex-1 text-lg font-medium text-gray-500 outline-none resize-none placeholder:text-gray-100 leading-relaxed custom-scrollbar"
                                value={selectedNote.content}
                                onChange={(e) => {
                                    const newContent = e.target.value;
                                    setSelectedNote({ ...selectedNote, content: newContent });
                                    saveNote(selectedNote.id, selectedNote.title, newContent);
                                }}
                                placeholder="Začnite písať..."
                            />
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                            <div className="w-24 h-24 bg-gray-50 rounded-[2.5rem] flex items-center justify-center text-3xl italic opacity-20 rotate-6 border border-gray-100">💡</div>
                            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-300 italic">Select a note to begin editing</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
