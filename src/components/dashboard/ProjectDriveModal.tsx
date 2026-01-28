'use client';

import * as React from 'react';
import { X, Folder, File, ExternalLink, Loader2, Plus, HardDrive, Search, ArrowLeft, Cloud } from 'lucide-react';
import { toast } from 'sonner';

interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    webViewLink: string;
    iconLink: string;
}

interface ProjectDriveModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: number;
    projectName: string;
    folderId?: string;
}

export function ProjectDriveModal({ isOpen, onClose, projectId, projectName, folderId }: ProjectDriveModalProps) {
    const [files, setFiles] = React.useState<DriveFile[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [currentFolderId, setCurrentFolderId] = React.useState<string | undefined>(folderId);
    const [folderHistory, setFolderHistory] = React.useState<{ id: string, name: string }[]>([]);

    React.useEffect(() => {
        if (isOpen) {
            setCurrentFolderId(folderId);
            setFolderHistory([]);
        }
    }, [isOpen, folderId]);

    const fetchFiles = async (targetId?: string) => {
        setLoading(true);
        try {
            // Priority: targetId -> currentFolderId -> folderId -> name search
            const idToFetch = targetId || currentFolderId;
            let url = '';

            if (idToFetch) {
                url = `/api/google/drive?folderId=${idToFetch}`;
            } else {
                url = `/api/google/drive?projectName=${encodeURIComponent(projectName)}`;
            }

            const res = await fetch(url);
            const data = await res.json();

            if (data.isConnected) {
                setFiles(data.files || []);
            } else {
                toast.error('Google Drive nie je prepojený');
            }
        } catch (error) {
            toast.error('Chyba pri načítavaní súborov');
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        if (isOpen) fetchFiles(currentFolderId);
    }, [isOpen, currentFolderId]);

    const handleFolderClick = (file: DriveFile) => {
        setFolderHistory(prev => [...prev, { id: currentFolderId || 'root', name: '...' }]); // Name could be improved if we tracked it
        setCurrentFolderId(file.id);
        setSearchQuery('');
    };

    const handleBack = () => {
        if (folderHistory.length === 0) return;
        const newHistory = [...folderHistory];
        const prev = newHistory.pop();
        setFolderHistory(newHistory);
        setCurrentFolderId(prev?.id === 'root' ? (folderId) : prev?.id);
    };

    if (!isOpen) return null;

    const filtered = files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />

            <div className="bg-white w-full max-w-4xl h-[80vh] rounded-[3rem] shadow-2xl relative z-10 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
                {/* Header */}
                <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gradient-to-r from-gray-50/50 to-white">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-100">
                            <HardDrive className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                                {folderHistory.length > 0 && (
                                    <button onClick={handleBack} className="max-md:hidden p-1 hover:bg-gray-100 rounded-lg -ml-2 mr-1 transition-colors">
                                        <ArrowLeft className="w-5 h-5 text-gray-500" />
                                    </button>
                                )}
                                {projectName}
                                <span className="text-gray-300 mx-2">/</span>
                                <span className="text-blue-600">Dokumenty</span>
                            </h2>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1 flex items-center gap-2">
                                {folderHistory.length > 0 ? (
                                    <button onClick={handleBack} className="hover:text-blue-600 flex items-center gap-1 transition-colors">
                                        <ArrowLeft className="w-3 h-3" /> Späť
                                    </button>
                                ) : (
                                    'Súbory synchronizované s Google Drive'
                                )}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-gray-100 rounded-2xl transition-all">
                        <X className="w-6 h-6 text-gray-400" />
                    </button>
                </div>

                {/* Toolbar */}
                <div className="px-8 py-4 border-b border-gray-50 bg-white flex items-center gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Hľadať v súboroch..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-6 py-3 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all"
                        />
                    </div>
                    <button className="bg-gray-900 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all shadow-lg active:scale-95">
                        <Plus className="w-4 h-4" /> Nahrať súbor
                    </button>
                </div>

                {/* File Grid/List */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center gap-4">
                            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Pripájam sa k Drive...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                            <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center italic text-4xl">📁</div>
                            <p className="text-sm font-black uppercase tracking-widest italic tracking-tighter">Tento priečinok je prázdny</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {filtered.map(file => {
                                const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                                return (
                                    <div
                                        key={file.id}
                                        onClick={() => {
                                            if (isFolder) {
                                                handleFolderClick(file);
                                            } else {
                                                window.open(file.webViewLink, '_blank');
                                            }
                                        }}
                                        className="cursor-pointer group bg-white p-6 rounded-[2.5rem] border border-gray-100 hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-100 transition-all flex flex-col items-center text-center gap-4 relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 left-0 w-full h-1 bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-transform group-hover:scale-110 ${isFolder ? 'bg-amber-50' : 'bg-blue-50'}`}>
                                            {isFolder ? (
                                                <Folder className="w-8 h-8 text-amber-500 fill-amber-500/20" />
                                            ) : (
                                                <img src={file.iconLink} alt="" className="w-8 h-8" />
                                            )}
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-xs font-black text-gray-900 block truncate w-full max-w-[140px] leading-tight capitalize italic">
                                                {file.name}
                                            </span>
                                        </div>
                                        {!isFolder && (
                                            <ExternalLink className="absolute bottom-4 right-4 w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer Stats */}
                <div className="p-6 border-t border-gray-50 bg-gray-50/50 flex justify-between items-center px-10">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{filtered.length} objektov</span>
                    <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2 hover:underline">
                        Otvoriť na Drive <ExternalLink className="w-3 h-3" />
                    </button>
                </div>
            </div>
        </div>
    );
}
