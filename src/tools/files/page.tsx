"use client";

import * as React from "react";
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
  List as ListIcon,
  MoreVertical,
  Download,
  Copy,
  Scissors,
  Clipboard,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { GoogleConnectButton } from "@/components/calendar/GoogleConnectButton";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  iconLink: string;
  size?: string;
  modifiedTime?: string;
}

export default function FilesTool() {
  const [files, setFiles] = React.useState<DriveFile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("list");
  const [path, setPath] = React.useState<{ id: string; name: string }[]>([]);
  const [isConnected, setIsConnected] = React.useState(true);

  // Multi-select state
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = React.useState<string | null>(
    null,
  );

  // Context menu state
  const [contextMenu, setContextMenu] = React.useState<{
    visible: boolean;
    x: number;
    y: number;
    file: DriveFile | null;
  }>({
    visible: false,
    x: 0,
    y: 0,
    file: null,
  });

  // Clipboard state
  const [clipboard, setClipboard] = React.useState<{
    op: "copy" | "cut";
    files: DriveFile[];
  } | null>(null);

  // Cache for prefetched folders
  const cacheRef = React.useRef<Map<string, DriveFile[]>>(new Map());

  // Prefetch subfolders in background
  const prefetchSubfolders = React.useCallback(
    async (parentFiles: DriveFile[]) => {
      const folders = parentFiles.filter(
        (f) => f.mimeType === "application/vnd.google-apps.folder",
      );

      // Prefetch each folder in parallel (limit to 5 concurrent)
      const batchSize = 5;
      for (let i = 0; i < folders.length; i += batchSize) {
        const batch = folders.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (folder) => {
            if (cacheRef.current.has(folder.id)) return; // Already cached

            try {
              const res = await fetch(
                `/api/google/drive?folderId=${folder.id}`,
              );
              const data = await res.json();
              if (data.isConnected && data.files) {
                cacheRef.current.set(folder.id, data.files);
              }
            } catch (e) {
              // Silent fail for prefetch
            }
          }),
        );
      }
    },
    [],
  );

  const fetchFiles = async (folderId?: string) => {
    const cacheKey = folderId || "root";
    setSelectedIds(new Set());

    // Check cache first
    if (cacheRef.current.has(cacheKey)) {
      const cached = cacheRef.current.get(cacheKey)!;
      setFiles(cached);
      setLoading(false);

      // Prefetch subfolders in background
      prefetchSubfolders(cached);

      // Refresh in background (stale-while-revalidate)
      fetch(
        folderId
          ? `/api/google/drive?folderId=${folderId}`
          : "/api/google/drive",
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.isConnected && data.files) {
            cacheRef.current.set(cacheKey, data.files);
            setFiles(data.files);
            prefetchSubfolders(data.files);
            setIsConnected(true);
          } else if (data.isConnected === false) {
            setIsConnected(false);
          }
        })
        .catch(() => {});
      return;
    }

    // Not in cache - fetch with loading state
    setLoading(true);
    try {
      const url = folderId
        ? `/api/google/drive?folderId=${folderId}`
        : "/api/google/drive";
      const res = await fetch(url);
      const data = await res.json();

      if (data.isConnected) {
        const fetchedFiles = data.files || [];
        setFiles(fetchedFiles);
        cacheRef.current.set(cacheKey, fetchedFiles);
        setIsConnected(true);

        // Prefetch subfolders
        prefetchSubfolders(fetchedFiles);
      } else {
        setIsConnected(false);
        toast.error("Google Drive nie je prepojený");
      }
    } catch (error) {
      toast.error("Chyba pri načítavaní súborov");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchFiles(path[path.length - 1]?.id);
  }, [path]);

  // Close context menu on global click
  React.useEffect(() => {
    const handleClick = () =>
      setContextMenu((prev) => ({ ...prev, visible: false }));
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  const navigateToFolder = (id: string, name: string) => {
    setPath([...path, { id, name }]);
  };

  const navigateBack = (index: number) => {
    if (index === -1) setPath([]);
    else setPath(path.slice(0, index + 1));
  };

  const filtered = files.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Handle file click with multi-select support
  const handleFileClick = (
    e: React.MouseEvent,
    file: DriveFile,
    index: number,
  ) => {
    e.stopPropagation();

    if (e.shiftKey && lastSelectedId) {
      // Shift+click: select range
      const lastIndex = filtered.findIndex((f) => f.id === lastSelectedId);
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

  // Handle double click to open
  const handleFileDoubleClick = (e: React.MouseEvent, file: DriveFile) => {
    e.preventDefault();
    e.stopPropagation();
    // Clear any text selection that might have occurred
    window.getSelection()?.removeAllRanges();

    const isFolder = file.mimeType === "application/vnd.google-apps.folder";
    if (isFolder) {
      navigateToFolder(file.id, file.name);
    } else {
      window.open(file.webViewLink, "_blank");
    }
  };

  // Handle context menu
  const handleContextMenu = (e: React.MouseEvent, file: DriveFile | null) => {
    e.preventDefault();
    e.stopPropagation();

    if (file && !selectedIds.has(file.id)) {
      setSelectedIds(new Set([file.id]));
      setLastSelectedId(file.id);
    }

    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      file,
    });
  };

  // Handle download
  const handleDownload = () => {
    const filesToDownload = filtered.filter((f) => selectedIds.has(f.id));
    filesToDownload.forEach((file) => {
      const url = `/api/google/download?fileId=${file.id}&mimeType=${encodeURIComponent(file.mimeType)}&name=${encodeURIComponent(file.name)}`;
      window.open(url, "_blank");
    });
    toast.success(`Sťahovanie ${filesToDownload.length} súborov...`);
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  // Clear selection on background click
  const handleBackgroundClick = () => {
    setSelectedIds(new Set());
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  if (!isConnected) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-20 text-center animate-in fade-in zoom-in-95 duration-700">
        <div className="relative mb-10 group">
          <div className="absolute inset-0 bg-violet-600/20 blur-3xl rounded-full group-hover:bg-violet-600/30 transition-all duration-500 scale-150" />
          <div className="w-24 h-24 bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-violet-500/20 flex items-center justify-center shadow-2xl relative z-10 transition-transform group-hover:scale-110">
            <HardDrive className="w-10 h-10 text-violet-500 drop-shadow-[0_0_8px_rgba(139,92,246,0.3)]" />
          </div>
        </div>

        <h2 className="text-3xl font-black text-foreground tracking-tighter uppercase italic mb-4">
          Google Drive nie je prepojený
        </h2>
        
        <p className="text-zinc-500 font-bold max-w-md leading-relaxed mb-10 text-sm uppercase tracking-wide">
          Pre prístup k firemným súborom, zmluvám a projektovej dokumentácii je potrebné autorizovať váš Google účet.
        </p>

        <div className="w-full max-w-xs space-y-4">
           <GoogleConnectButton />
           <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none">
              Zabezpečené cez Clerk OAuth 2.0
           </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-foreground tracking-tighter uppercase italic">
            Cloud
          </h1>
        </div>
        <div className="flex gap-4">
          {selectedIds.size > 0 && (
            <span className="bg-violet-100 text-violet-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-violet-500/10">
              {selectedIds.size} vybraných
            </span>
          )}
          <button className="bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl active:scale-95 transition-all">
            <Plus className="w-4 h-4" /> Nový súbor / Priečinok
          </button>
        </div>
      </div>

      {/* Breadcrumbs & View Toggle */}
      <div className="flex items-center justify-between bg-card p-4 rounded-3xl border border-border shadow-sm transition-colors">
        <div className="flex items-center gap-2 text-sm font-bold overflow-x-auto no-scrollbar">
          <button
            onClick={() => navigateBack(-1)}
            className={`hover:text-violet-500 transition-colors ${path.length === 0 ? "text-foreground" : "text-gray-500"}`}
          >
            Drive
          </button>
          {path.map((p, i) => (
            <React.Fragment key={p.id}>
              <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
              <button
                onClick={() => navigateBack(i)}
                className={`hover:text-violet-500 transition-colors whitespace-nowrap ${i === path.length - 1 ? "text-foreground" : "text-gray-500"}`}
              >
                {p.name}
              </button>
            </React.Fragment>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-white text-violet-600 shadow-sm" : "text-gray-400"}`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-white text-violet-600 shadow-sm" : "text-gray-400"}`}
          >
            <ListIcon className="w-4 h-4" />
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
          className="w-full pl-16 pr-8 py-5 bg-card border border-border rounded-[2.5rem] text-lg font-bold text-foreground shadow-sm focus:border-violet-500/50 outline-none transition-all placeholder:text-gray-500 select-none focus:ring-4 focus:ring-violet-500/5"
        />
      </div>

      {/* File Area */}
      <div
        className="flex-1 overflow-y-auto min-h-0 thin-scrollbar pr-2"
        onClick={handleBackgroundClick}
        onContextMenu={(e) => {
          if (e.target === e.currentTarget) {
            handleContextMenu(e, null);
          }
        }}
      >
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 py-20 select-none">
            <Loader2 className="w-12 h-12 text-violet-600 animate-spin" />
            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
              Sťahujem dáta z Google Drive...
            </span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-20 opacity-20 italic select-none">
            <HardDrive className="w-20 h-20 mb-4" />
            <p className="text-xl font-black uppercase tracking-widest">
              Priečinok je prázdny
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <div
            className="min-h-full pb-20"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedIds(new Set());
              }
            }}
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {filtered.map((file, index) => {
                const isFolder =
                  file.mimeType === "application/vnd.google-apps.folder";
                const isSelected = selectedIds.has(file.id);
                return (
                  <div
                    key={file.id}
                    onClick={(e) => handleFileClick(e, file, index)}
                    onDoubleClick={(e) => handleFileDoubleClick(e, file)}
                    onContextMenu={(e) => handleContextMenu(e, file)}
                    className={`group bg-card p-6 rounded-[2.5rem] border transition-all flex flex-col items-center text-center gap-4 relative overflow-hidden cursor-pointer select-none ${isSelected ? "border-violet-500 ring-4 ring-violet-500/10" : "border-border hover:border-violet-500/50 hover:shadow-2xl hover:shadow-violet-900/10"}`}
                  >
                    <div
                      className={`absolute top-0 left-0 w-full h-1 ${isSelected ? "bg-violet-500 opacity-100" : "bg-violet-600 opacity-0 group-hover:opacity-100"} transition-opacity`}
                    ></div>
                    <div
                      className={`w-20 h-20 rounded-[2.5rem] flex items-center justify-center transition-transform group-hover:scale-110 shadow-inner ${isFolder ? "bg-amber-50" : "bg-violet-50"}`}
                    >
                      {isFolder ? (
                        <Folder className="w-10 h-10 text-amber-500 fill-amber-500/20" />
                      ) : (
                        <img src={file.iconLink} alt="" className="w-10 h-10" />
                      )}
                    </div>
                    <div className="space-y-1 w-full">
                      <span className="text-sm font-black text-foreground block truncate leading-tight capitalize">
                        {file.name}
                      </span>
                      {!isFolder && (
                        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                          Súbor
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleContextMenu(e, file);
                      }}
                      className="absolute bottom-4 right-4 p-2 text-gray-200 hover:text-gray-900 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-[2rem] border border-border overflow-hidden shadow-sm transition-colors">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400 select-none">
                <tr>
                  <th className="px-6 py-4">Názov</th>
                  <th className="px-6 py-4">Typ</th>
                  <th className="px-6 py-4">Veľkosť</th>
                  <th className="px-6 py-4">Upravené</th>
                  <th className="px-6 py-4 text-right">Akcie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((file, index) => {
                  const isFolder =
                    file.mimeType === "application/vnd.google-apps.folder";
                  const isSelected = selectedIds.has(file.id);
                  return (
                    <tr
                      key={file.id}
                      onClick={(e) => handleFileClick(e, file, index)}
                      onDoubleClick={(e) => handleFileDoubleClick(e, file)}
                      onContextMenu={(e) => handleContextMenu(e, file)}
                      className={`transition-colors cursor-pointer group select-none ${isSelected ? "bg-violet-50 dark:bg-violet-900/10" : "hover:bg-violet-50/50 dark:hover:bg-violet-900/5"}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {isFolder ? (
                            <Folder className="w-5 h-5 text-amber-500" />
                          ) : (
                            <img src={file.iconLink} className="w-5 h-5" />
                          )}
                          <span className="font-bold text-gray-900 text-sm">
                            {file.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest italic">
                        {isFolder ? "Priečinok" : "Súbor"}
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-gray-400">
                        {isFolder
                          ? "--"
                          : file.size
                            ? `${(parseInt(file.size) / 1024 / 1024).toFixed(1)} MB`
                            : "N/A"}
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-gray-400">
                        {file.modifiedTime
                          ? new Date(file.modifiedTime).toLocaleDateString(
                              "sk-SK",
                              {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              },
                            )
                          : "--"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(file.webViewLink, "_blank");
                          }}
                          className="p-2 text-gray-300 hover:text-violet-600 dark:hover:text-violet-400 opacity-0 group-hover:opacity-100 transition-all font-bold"
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

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          className="fixed bg-card rounded-xl shadow-2xl border border-border p-2 z-[200] min-w-[220px] animate-in fade-in zoom-in-95 duration-200"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.file ? (
            <>
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3 py-2 border-b border-gray-50 mb-1 truncate max-w-[200px] flex items-center gap-2">
                {contextMenu.file.mimeType ===
                "application/vnd.google-apps.folder" ? (
                  <Folder className="w-3 h-3" />
                ) : (
                  <File className="w-3 h-3" />
                )}
                <span className="truncate">
                  {selectedIds.size > 1
                    ? `${selectedIds.size} položiek`
                    : contextMenu.file.name}
                </span>
              </div>

              <button
                onClick={handleDownload}
                className="w-full text-left px-3 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-600 dark:hover:text-violet-400 rounded-lg transition-colors flex items-center gap-3"
              >
                <Download className="w-4 h-4 text-gray-400 group-hover:text-violet-500" /> Stiahnuť
              </button>

              <button
                onClick={() => {
                  const isFolder =
                    contextMenu.file?.mimeType ===
                    "application/vnd.google-apps.folder";
                  if (isFolder) {
                    navigateToFolder(
                      contextMenu.file!.id,
                      contextMenu.file!.name,
                    );
                  } else {
                    window.open(contextMenu.file?.webViewLink, "_blank");
                  }
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                }}
                className="w-full text-left px-3 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-600 dark:hover:text-violet-400 rounded-lg transition-colors flex items-center gap-3"
              >
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-violet-500" /> Otvoriť
              </button>
            </>
          ) : (
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3 py-2">
              Žiadny súbor vybraný
            </div>
          )}
        </div>
      )}
    </div>
  );
}
