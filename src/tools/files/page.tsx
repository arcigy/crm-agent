'use client';

import * as React from 'react';
import {
    HardDrive,
    Search,
    Plus,
    Folder,
    File,
    ExternalLink,
    Loader2,
    ChevronRight,
    Grid,
    List,
    MoreVertical
} from 'lucide-react';
import { toast } from 'sonner';

interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    webViewLink: string;
    iconLink: string;
    size?: string;
}

export default function FilesTool() {
    const [files, setFiles] = React.useState<DriveFile[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');
    const [path, setPath] = React.useState<{ id: string; name: string }[]>([]);

    const fetchFiles = async (folderId?: string) => {
        setLoading(true);
        try {
            const url = folderId ? `/api/google/drive?folderId=${folderId}` : '/api/google/drive';
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
        fetchFiles(path[path.length - 1]?.id);
    }, [path]);

    const navigateToFolder = (id: string, name: string) => {
        setPath([...path, { id, name }]);
    };

    const navigateBack = (index: number) => {
        if (index === -1) setPath([]);
        else setPath(path.slice(0, index + 1));
    };

    const filtered = files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="space-y-8 animate-in fade-in duration-700 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic">
                        Cloud / <span className="text-blue-600">Files</span>
                    </h1>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mt-2 opacity-60">Corporate storage infrastructure</p>
                </div>
                <div className="flex gap-4">
                    <button className="bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl active:scale-95 transition-all">
                        <Plus className="w-4 h-4" /> Nový súbor / Priečinok
                    </button>
                </div>
            </div>

            {/* Breadcrumbs & View Toggle */}
            <div className="flex items-center justify-between bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-bold overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => navigateBack(-1)}
                        className={`hover:text-blue-600 transition-colors ${path.length === 0 ? 'text-gray-900' : 'text-gray-400'}`}
                    >
                        Drive
                    </button>
                    {path.map((p, i) => (
                        <React.Fragment key={p.id}>
                            <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                            <button
                                onClick={() => navigateBack(i)}
                                className={`hover:text-blue-600 transition-colors whitespace-nowrap ${i === path.length - 1 ? 'text-gray-900' : 'text-gray-400'}`}
                            >
                                {p.name}
                            </button>
                        </React.Fragment>
                    ))}
                </div>
                <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl">
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
                        <List className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Search & Toolbar */}
            <div className="relative">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Hľadať v cloude..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-16 pr-8 py-5 bg-white border border-gray-100 rounded-[2rem] text-lg font-bold text-gray-900 shadow-sm focus:border-blue-200 outline-none transition-all placeholder:text-gray-200"
                />
            </div>

            {/* File Area */}
            <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar pr-2">
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center gap-4 py-20">
                        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Sťahujem dáta z Google Drive...</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-20 opacity-20 italic">
                        <HardDrive className="w-20 h-20 mb-4" />
                        <p className="text-xl font-black uppercase tracking-widest">Priečinok je prázdny</p>
                    </div>
                ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {filtered.map(file => {
                            const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                            return (
                                <div
                                    key={file.id}
                                    onClick={() => isFolder ? navigateToFolder(file.id, file.name) : window.open(file.webViewLink, '_blank')}
                                    className="group bg-white p-6 rounded-[2.5rem] border border-gray-100 hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-100 transition-all flex flex-col items-center text-center gap-4 relative overflow-hidden cursor-pointer"
                                >
                                    <div className="absolute top-0 left-0 w-full h-1 bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center transition-transform group-hover:scale-110 ${isFolder ? 'bg-amber-50' : 'bg-blue-50'}`}>
                                        {isFolder ? (
                                            <Folder className="w-10 h-10 text-amber-500 fill-amber-500/20" />
                                        ) : (
                                            <img src={file.iconLink} alt="" className="w-10 h-10" />
                                        )}
                                    </div>
                                    <div className="space-y-1 w-full">
                                        <span className="text-sm font-black text-gray-900 block truncate leading-tight capitalize">
                                            {file.name}
                                        </span>
                                        {!isFolder && <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Súbor</span>}
                                    </div>
                                    <button className="absolute bottom-4 right-4 p-2 text-gray-200 hover:text-gray-900 transition-colors opacity-0 group-hover:opacity-100">
                                        <MoreVertical className="w-4 h-4" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                <tr>
                                    <th className="px-6 py-4">Názov</th>
                                    <th className="px-6 py-4">Typ</th>
                                    <th className="px-6 py-4">Veľkosť</th>
                                    <th className="px-6 py-4 text-right">Akcie</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map(file => {
                                    const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                                    return (
                                        <tr
                                            key={file.id}
                                            onClick={() => isFolder ? navigateToFolder(file.id, file.name) : window.open(file.webViewLink, '_blank')}
                                            className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    {isFolder ? <Folder className="w-5 h-5 text-amber-500" /> : <img src={file.iconLink} className="w-5 h-5" />}
                                                    <span className="font-bold text-gray-900 text-sm">{file.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest italic">
                                                {isFolder ? 'Priečinok' : 'Súbor'}
                                            </td>
                                            <td className="px-6 py-4 text-xs font-medium text-gray-400">
                                                {isFolder ? '--' : (file.size ? `${(parseInt(file.size) / 1024 / 1024).toFixed(1)} MB` : 'N/A')}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="p-2 text-gray-300 hover:text-gray-900 opacity-0 group-hover:opacity-100 transition-all">
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
        </div>
    );
}
