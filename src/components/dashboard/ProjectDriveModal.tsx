'use client';

import * as React from 'react';
import { X, Folder, File, ExternalLink, Loader2, Plus, HardDrive, Search, ArrowLeft, Cloud, Scissors, Copy, Clipboard, Download, Grid, List as ListIcon } from 'lucide-react';
import { toast } from 'sonner';

interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    webViewLink: string;
    iconLink: string;
    thumbnailLink?: string;
    webContentLink?: string;
    modifiedTime?: string;
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
    const [isUploading, setIsUploading] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Context Menu & Clipboard State
    const [contextMenu, setContextMenu] = React.useState<{ visible: boolean, x: number, y: number, file: DriveFile | null }>({
        visible: false,
        x: 0,
        y: 0,
        file: null
    });
    const [clipboard, setClipboard] = React.useState<{ op: 'copy' | 'cut', file: DriveFile } | null>(null);
    const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
    const [lastSelectedId, setLastSelectedId] = React.useState<string | null>(null);
    const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('list');

    // Close context menu on global click
    React.useEffect(() => {
        const handleClick = () => setContextMenu({ ...contextMenu, visible: false });
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, [contextMenu]);

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
        setFolderHistory(prev => [...prev, { id: currentFolderId || 'root', name: '...' }]);
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

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;

        setIsUploading(true);
        const files = Array.from(e.target.files);
        let successCount = 0;

        try {
            const targetId = currentFolderId || folderId;
            if (!targetId) {
                toast.error('Nie je vybraný žiadny priečinok na nahrávanie');
                return;
            }

            for (const file of files) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('folderId', targetId);

                const res = await fetch('/api/google/upload', {
                    method: 'POST',
                    body: formData,
                });

                if (res.ok) successCount++;
            }

            if (successCount > 0) {
                toast.success(`Nahratých ${successCount} súborov`);
                fetchFiles(targetId);
            } else {
                toast.error('Nepodarilo sa nahrať súbory');
            }
        } catch (error) {
            console.error('Upload failed', error);
            toast.error('Chyba pri nahrávaní');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleContextMenu = (e: React.MouseEvent, file: DriveFile | null) => {
        e.preventDefault();
        setContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            file
        });
    };

    const handleDelete = async (file: DriveFile) => {
        if (!confirm(`Naozaj chcete vymazať ${file.name}?`)) return;

        const toastId = toast.loading('Vymazávam...');
        try {
            const res = await fetch(`/api/google/drive?fileId=${file.id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Súbor vymazaný', { id: toastId });
                fetchFiles(currentFolderId);
            } else {
                throw new Error('Failed to delete');
            }
        } catch (e) {
            toast.error('Chyba pri mazaní', { id: toastId });
        }
    };

    const handleRename = async (file: DriveFile) => {
        const newName = prompt('Zadajte nový názov:', file.name);
        if (!newName || newName === file.name) return;

        const toastId = toast.loading('Premenovávam...');
        try {
            const res = await fetch(`/api/google/drive`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileId: file.id, name: newName })
            });

            if (res.ok) {
                toast.success('Súbor premenovaný', { id: toastId });
                fetchFiles(currentFolderId);
            } else {
                throw new Error('Failed to rename');
            }
        } catch (e) {
            toast.error('Chyba pri premenovávaní', { id: toastId });
        }
    };

    const handleCopy = (file: DriveFile) => {
        if (file.mimeType === 'application/vnd.google-apps.folder') {
            toast.error('Priečinky zatiaľ nie je možné kopírovať');
            return;
        }
        setClipboard({ op: 'copy', file });
        toast.success('Skopírované do schránky');
        setContextMenu({ ...contextMenu, visible: false });
    };

    const handleCut = (file: DriveFile) => {
        setClipboard({ op: 'cut', file });
        toast.success('Vystrihnuté (pripravené na presun)');
        setContextMenu({ ...contextMenu, visible: false });
    };

    const handlePaste = async () => {
        if (!clipboard) return;

        const targetId = currentFolderId || folderId;
        if (!targetId) return;

        const toastId = toast.loading(clipboard.op === 'cut' ? 'Presúvam...' : 'Kopírujem...');

        try {
            const body: any = {
                action: clipboard.op === 'copy' ? 'copy' : 'move',
            };

            if (clipboard.op === 'copy') {
                body.copyFileId = clipboard.file.id;
                body.parentId = targetId;
                body.name = `Kópia - ${clipboard.file.name}`;
            } else {
                body.fileId = clipboard.file.id;
                body.destinationId = targetId;
            }

            const method = clipboard.op === 'copy' ? 'POST' : 'PATCH';

            const res = await fetch('/api/google/drive', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                toast.success(clipboard.op === 'copy' ? 'Súbor skopírovaný' : 'Súbor presunutý', { id: toastId });
                fetchFiles(targetId);
                if (clipboard.op === 'cut') setClipboard(null);
            } else {
                throw new Error('Action failed');
            }
        } catch (error) {
            toast.error('Chyba pri operácii', { id: toastId });
        }
        setContextMenu({ ...contextMenu, visible: false });
    };

    const handleDownload = (file: DriveFile) => {
        const url = `/api/google/download?fileId=${file.id}&mimeType=${encodeURIComponent(file.mimeType)}&name=${encodeURIComponent(file.name)}`;
        window.open(url, '_blank');
        toast.success('Sťahovanie začalo...');
        setContextMenu({ ...contextMenu, visible: false });
    };

    // Multi-select click handler
    const handleFileClick = (e: React.MouseEvent, file: DriveFile, index: number) => {
        e.stopPropagation();

        if (e.shiftKey && lastSelectedId) {
            // Shift+click: select range
            const lastIndex = filtered.findIndex(f => f.id === lastSelectedId);
            const currentIndex = index;
            const start = Math.min(lastIndex, currentIndex);
            const end = Math.max(lastIndex, currentIndex);

            const newSelected = new Set(selectedIds);
            for (let i = start; i <= end; i++) {
                newSelected.add(filtered[i].id);
            }
            setSelectedIds(newSelected);
        } else if (e.ctrlKey || e.metaKey) {
            // Ctrl+click: toggle selection
            const newSelected = new Set(selectedIds);
            if (newSelected.has(file.id)) {
                newSelected.delete(file.id);
            } else {
                newSelected.add(file.id);
            }
            setSelectedIds(newSelected);
            setLastSelectedId(file.id);
        } else {
            // Normal click: single select
            setSelectedIds(new Set([file.id]));
            setLastSelectedId(file.id);
        }
    };

    // Keyboard Shortcuts
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            const firstSelectedId = selectedIds.size > 0 ? Array.from(selectedIds)[0] : null;

            // Ctrl+C
            if ((e.ctrlKey || e.metaKey) && e.key === 'c' && firstSelectedId) {
                const file = files.find(f => f.id === firstSelectedId);
                if (file) handleCopy(file);
            }

            // Ctrl+X
            if ((e.ctrlKey || e.metaKey) && e.key === 'x' && firstSelectedId) {
                const file = files.find(f => f.id === firstSelectedId);
                if (file) handleCut(file);
            }

            // Ctrl+V
            if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                handlePaste();
            }

            // Ctrl+A - select all
            if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                e.preventDefault();
                setSelectedIds(new Set(filtered.map(f => f.id)));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, selectedIds, clipboard, files, currentFolderId, folderId, filtered]);

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
                            className="w-full pl-12 pr-6 py-3 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all select-none"
                        />
                    </div>
                    <input
                        type="file"
                        multiple
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                    />
                    <button
                        disabled={isUploading || loading}
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-gray-900 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        {isUploading ? 'Nahrávam...' : 'Nahrať súbor'}
                    </button>
                    <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}
                        >
                            <Grid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}
                        >
                            <ListIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* File Grid/List */}
                <div
                    className="flex-1 overflow-y-auto p-8 custom-scrollbar relative"
                    onContextMenu={(e) => {
                        if (e.target === e.currentTarget) {
                            handleContextMenu(e, null);
                        }
                    }}
                    onClick={() => {
                        setSelectedIds(new Set());
                        setContextMenu({ ...contextMenu, visible: false });
                    }}
                >
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center gap-4 select-none">
                            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Pripájam sa k Drive...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40 select-none">
                            <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center italic text-4xl">📁</div>
                            <p className="text-sm font-black uppercase tracking-widest italic tracking-tighter">Tento priečinok je prázdny</p>
                        </div>
                    ) : viewMode === 'grid' ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {filtered.map((file, index) => {
                                const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                                const isSelected = selectedIds.has(file.id);
                                return (
                                    <div
                                        key={file.id}
                                        onClick={(e) => handleFileClick(e, file, index)}
                                        onDoubleClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            window.getSelection()?.removeAllRanges();
                                            isFolder ? handleFolderClick(file) : window.open(file.webViewLink, '_blank');
                                        }}
                                        onContextMenu={(e) => {
                                            e.stopPropagation();
                                            if (!selectedIds.has(file.id)) {
                                                setSelectedIds(new Set([file.id]));
                                                setLastSelectedId(file.id);
                                            }
                                            handleContextMenu(e, file);
                                        }}
                                        className={`cursor-pointer group bg-white p-6 rounded-[2.5rem] border hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-100 transition-all flex flex-col items-center text-center gap-4 relative overflow-hidden select-none ${isSelected ? 'border-blue-500 ring-4 ring-blue-50' : 'border-gray-100'}`}
                                    >
                                        <div className={`absolute top-0 left-0 w-full h-1 ${isSelected ? 'bg-blue-500 opacity-100' : 'bg-blue-600 opacity-0 group-hover:opacity-100'} transition-opacity`}></div>
                                        <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-transform group-hover:scale-110 ${isFolder ? 'bg-amber-50' : 'bg-blue-50'} overflow-hidden`}>
                                            {isFolder ? (
                                                <Folder className="w-8 h-8 text-amber-500 fill-amber-500/20" />
                                            ) : file.thumbnailLink ? (
                                                <img src={file.thumbnailLink} alt="" className="w-full h-full object-cover" />
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
                    ) : (
                        <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400 select-none">
                                    <tr>
                                        <th className="px-6 py-4">Názov</th>
                                        <th className="px-6 py-4">Typ</th>
                                        <th className="px-6 py-4">Upravené</th>
                                        <th className="px-6 py-4 text-right">Akcie</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filtered.map((file, index) => {
                                        const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                                        const isSelected = selectedIds.has(file.id);
                                        return (
                                            <tr
                                                key={file.id}
                                                onClick={(e) => handleFileClick(e, file, index)}
                                                onDoubleClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    window.getSelection()?.removeAllRanges();
                                                    isFolder ? handleFolderClick(file) : window.open(file.webViewLink, '_blank');
                                                }}
                                                onContextMenu={(e) => {
                                                    e.stopPropagation();
                                                    if (!selectedIds.has(file.id)) {
                                                        setSelectedIds(new Set([file.id]));
                                                        setLastSelectedId(file.id);
                                                    }
                                                    handleContextMenu(e, file);
                                                }}
                                                className={`transition-colors cursor-pointer group select-none ${isSelected ? 'bg-blue-50' : 'hover:bg-blue-50/50'}`}
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        {isFolder ? <Folder className="w-5 h-5 text-amber-500" /> : <img src={file.iconLink} className="w-5 h-5" />}
                                                        <span className="font-bold text-gray-900 text-sm truncate max-w-[300px]">{file.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest italic">
                                                    {isFolder ? 'Priečinok' : 'Súbor'}
                                                </td>
                                                <td className="px-6 py-4 text-xs font-medium text-gray-400">
                                                    {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '--'}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); window.open(file.webViewLink, '_blank'); }}
                                                        className="p-2 text-gray-300 hover:text-gray-900 opacity-0 group-hover:opacity-100 transition-all"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
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

            {/* Context Menu (File) */}
            {
                contextMenu.visible && contextMenu.file && (
                    <div
                        className="fixed bg-white rounded-xl shadow-2xl border border-gray-100 p-2 z-[200] min-w-[220px] animate-in fade-in zoom-in-95 duration-200"
                        style={{ top: contextMenu.y, left: contextMenu.x }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3 py-2 border-b border-gray-50 mb-1 truncate max-w-[200px] flex items-center gap-2">
                            {contextMenu.file.mimeType === 'application/vnd.google-apps.folder' ? <Folder className="w-3 h-3" /> : <File className="w-3 h-3" />}
                            <span className="truncate">{contextMenu.file.name}</span>
                        </div>

                        <button
                            onClick={() => handleDownload(contextMenu.file!)}
                            className="w-full text-left px-3 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-lg transition-colors flex items-center gap-3"
                        >
                            <Download className="w-4 h-4 text-gray-400" /> Stiahnuť
                        </button>

                        <div className="h-px bg-gray-100 my-1" />

                        <button
                            onClick={() => {
                                if (contextMenu.file?.mimeType === 'application/vnd.google-apps.folder') {
                                    handleFolderClick(contextMenu.file);
                                } else {
                                    window.open(contextMenu.file?.webViewLink, '_blank');
                                }
                                setContextMenu({ ...contextMenu, visible: false });
                            }}
                            className="w-full text-left px-3 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-lg transition-colors flex items-center gap-3"
                        >
                            <ExternalLink className="w-4 h-4 text-gray-400" /> Otvoriť
                        </button>

                        <button
                            onClick={() => {
                                window.open(contextMenu.file?.webViewLink, '_blank');
                                setContextMenu({ ...contextMenu, visible: false });
                            }}
                            className="w-full text-left px-3 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-lg transition-colors flex items-center gap-3"
                        >
                            <Cloud className="w-4 h-4 text-gray-400" /> Otvoriť na Drive
                        </button>

                        <div className="h-px bg-gray-100 my-1" />

                        <button
                            onClick={() => handleCopy(contextMenu.file!)}
                            className="w-full text-left px-3 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-lg transition-colors flex items-center gap-3"
                        >
                            <Copy className="w-4 h-4 text-gray-400" /> Kopírovať
                        </button>

                        <button
                            onClick={() => handleCut(contextMenu.file!)}
                            className="w-full text-left px-3 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-lg transition-colors flex items-center gap-3"
                        >
                            <Scissors className="w-4 h-4 text-gray-400" /> Vystrihnúť
                        </button>

                        <div className="h-px bg-gray-100 my-1" />

                        <button
                            onClick={() => {
                                handleRename(contextMenu.file!);
                                setContextMenu({ ...contextMenu, visible: false });
                            }}
                            className="w-full text-left px-3 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-lg transition-colors flex items-center gap-3"
                        >
                            <File className="w-4 h-4 text-gray-400" /> Premenovať
                        </button>

                        <button
                            onClick={() => {
                                handleDelete(contextMenu.file!);
                                setContextMenu({ ...contextMenu, visible: false });
                            }}
                            className="w-full text-left px-3 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-3"
                        >
                            <X className="w-4 h-4 text-red-400" /> Vymazať
                        </button>
                    </div>
                )
            }

            {/* Context Menu (Background) */}
            {
                contextMenu.visible && !contextMenu.file && (
                    <div
                        className="fixed bg-white rounded-xl shadow-2xl border border-gray-100 p-2 z-[200] min-w-[220px] animate-in fade-in zoom-in-95 duration-200"
                        style={{ top: contextMenu.y, left: contextMenu.x }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={handlePaste}
                            disabled={!clipboard}
                            className="w-full text-left px-3 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-lg transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Clipboard className="w-4 h-4 text-gray-400" /> Vložiť
                            {clipboard && <span className="text-[9px] text-gray-400 ml-auto uppercase tracking-widest">{clipboard.op}</span>}
                        </button>
                    </div>
                )
            }
        </div >
    );
}
