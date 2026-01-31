"use client";

import * as React from "react";
import {
  X,
  HardDrive,
  Search,
  Plus,
  Grid,
  List as ListIcon,
  Loader2,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { useDriveFiles, DriveFile } from "@/hooks/useDriveFiles";
import { FileItem } from "@/components/dashboard/projects/FileItem";
import { DriveContextMenu } from "@/components/dashboard/projects/DriveContextMenu";

interface DriveViewerProps {
  projectId: number;
  projectName: string;
  folderId?: string;
  subfolderName?: string;
}

export function DriveViewer({
  projectId,
  projectName,
  folderId,
  subfolderName,
}: DriveViewerProps) {
  const {
    files,
    loading,
    currentFolderId,
    setCurrentFolderId,
    folderHistory,
    setFolderHistory,
    isUploading,
    setIsUploading,
    fetchFiles,
    deleteFile,
    renameFile,
    performClipboardAction,
  } = useDriveFiles(projectId, projectName, folderId, subfolderName);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("list");
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [clipboard, setClipboard] = React.useState<{
    op: "copy" | "cut";
    file: DriveFile;
  } | null>(null);
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

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setCurrentFolderId(folderId);
    setFolderHistory([]);
    fetchFiles(folderId);
  }, [folderId, fetchFiles, setCurrentFolderId, setFolderHistory]);

  const filtered = files.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setIsUploading(true);
    const targetId = currentFolderId || folderId;
    if (!targetId) {
      toast.error("Žiadny cieľový priečinok");
      setIsUploading(false);
      return;
    }

    try {
      for (const file of Array.from(e.target.files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folderId", targetId);
        await fetch("/api/google/upload", { method: "POST", body: formData });
      }
      toast.success("Súbory nahraté");
      fetchFiles(targetId);
    } catch (error) {
      toast.error("Chyba pri nahrávaní");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <Toolbar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isUploading={isUploading}
        loading={loading}
        onUploadClick={() => fileInputRef.current?.click()}
        viewMode={viewMode}
        setViewMode={setViewMode}
        projectName={projectName}
        folderHistory={folderHistory}
        onBack={() => {
          const newHistory = [...folderHistory];
          const prev = newHistory.pop();
          setFolderHistory(newHistory);
          setCurrentFolderId(prev?.id === "root" ? folderId : prev?.id);
        }}
      />

      <div
        className="flex-1 overflow-y-auto p-4 custom-scrollbar relative"
        onClick={() => {
          setSelectedIds(new Set());
          setContextMenu({ ...contextMenu, visible: false });
        }}
      >
        {loading ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((file, idx) => (
              <FileItem
                key={file.id}
                file={file}
                index={idx}
                isSelected={selectedIds.has(file.id)}
                viewMode="grid"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIds(new Set([file.id]));
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  file.mimeType.includes("folder")
                    ? (setFolderHistory([
                        ...folderHistory,
                        { id: currentFolderId || "root", name: "..." },
                      ]),
                      setCurrentFolderId(file.id))
                    : window.open(file.webViewLink, "_blank");
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedIds(new Set([file.id]));
                  setContextMenu({
                    visible: true,
                    x: e.clientX,
                    y: e.clientY,
                    file,
                  });
                }}
              />
            ))}
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <tbody className="divide-y divide-border/50">
                {filtered.map((file, idx) => (
                  <FileItem
                    key={file.id}
                    file={file}
                    index={idx}
                    isSelected={selectedIds.has(file.id)}
                    viewMode="list"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedIds(new Set([file.id]));
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      file.mimeType.includes("folder")
                        ? (setFolderHistory([
                            ...folderHistory,
                            { id: currentFolderId || "root", name: "..." },
                          ]),
                          setCurrentFolderId(file.id))
                        : window.open(file.webViewLink, "_blank");
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedIds(new Set([file.id]));
                      setContextMenu({
                        visible: true,
                        x: e.clientX,
                        y: e.clientY,
                        file,
                      });
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Footer count={filtered.length} />

      <input
        type="file"
        multiple
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileUpload}
      />
      <DriveContextMenu
        {...contextMenu}
        clipboard={clipboard}
        onDownload={(f) => {
          window.open(
            `/api/google/download?fileId=${f.id}&name=${encodeURIComponent(f.name)}`,
            "_blank",
          );
          setContextMenu({ ...contextMenu, visible: false });
        }}
        onOpen={(f) => {
          f.mimeType.includes("folder")
            ? (setFolderHistory([
                ...folderHistory,
                { id: currentFolderId || "root", name: "..." },
              ]),
              setCurrentFolderId(f.id))
            : window.open(f.webViewLink, "_blank");
          setContextMenu({ ...contextMenu, visible: false });
        }}
        onCopy={(f) => {
          setClipboard({ op: "copy", file: f });
          setContextMenu({ ...contextMenu, visible: false });
        }}
        onCut={(f) => {
          setClipboard({ op: "cut", file: f });
          setContextMenu({ ...contextMenu, visible: false });
        }}
        onRename={(f) => {
          renameFile(f.id, f.name);
          setContextMenu({ ...contextMenu, visible: false });
        }}
        onDelete={(f) => {
          deleteFile(f.id, f.name);
          setContextMenu({ ...contextMenu, visible: false });
        }}
        onPaste={() => {
          if (clipboard)
            performClipboardAction(
              clipboard.op,
              clipboard.file.id,
              currentFolderId || folderId || "root",
            );
          setContextMenu({ ...contextMenu, visible: false });
        }}
        onClose={() => setContextMenu({ ...contextMenu, visible: false })}
      />
    </div>
  );
}

function Toolbar({
  searchQuery,
  setSearchQuery,
  isUploading,
  loading,
  onUploadClick,
  viewMode,
  setViewMode,
  projectName,
  folderHistory,
  onBack,
}: any) {
  return (
    <div className="px-6 py-4 border-b border-border bg-card flex items-center gap-4 shrink-0 overflow-x-auto no-scrollbar">
      <div className="hidden sm:flex items-center gap-2 mr-2">
        {folderHistory.length > 0 && (
          <button
            onClick={onBack}
            className="p-1.5 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
        <span className="text-xs font-black uppercase text-zinc-400 whitespace-nowrap">
          {projectName}
        </span>
      </div>

      <div className="relative flex-1 min-w-[150px]">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Hľadať súbory..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-2.5 bg-muted/50 border border-border rounded-xl text-xs font-bold focus:bg-card focus:border-blue-500 outline-none transition-all text-foreground"
        />
      </div>

      <button
        disabled={isUploading || loading}
        onClick={onUploadClick}
        className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all shadow-sm active:scale-95 disabled:opacity-50 whitespace-nowrap"
      >
        {isUploading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Plus className="w-3.5 h-3.5" />
        )}{" "}
        {isUploading ? "Nahrávam..." : "Nahrať"}
      </button>

      <div className="flex bg-muted/50 p-1 rounded-xl shrink-0">
        <button
          onClick={() => setViewMode("grid")}
          className={`p-1.5 rounded-lg transition-all ${viewMode === "grid" ? "bg-white dark:bg-zinc-800 text-blue-600 shadow-sm" : "text-zinc-400"}`}
        >
          <Grid className="w-4 h-4" />
        </button>
        <button
          onClick={() => setViewMode("list")}
          className={`p-1.5 rounded-lg transition-all ${viewMode === "list" ? "bg-white dark:bg-zinc-800 text-blue-600 shadow-sm" : "text-zinc-400"}`}
        >
          <ListIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="h-48 flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
        Pripájam sa...
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-48 flex flex-col items-center justify-center text-center opacity-40">
      <div className="w-16 h-16 bg-muted rounded-3xl flex items-center justify-center text-3xl mb-4">
        📁
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
        Priečinok je prázdny
      </p>
    </div>
  );
}

function Footer({ count }: any) {
  return (
    <div className="px-8 py-4 border-t border-border bg-muted/20 flex justify-between items-center shrink-0">
      <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
        {count} objektov
      </span>
      <button className="text-[9px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2 hover:underline">
        Otvoriť na Drive <ExternalLink className="w-3 h-3" />
      </button>
    </div>
  );
}
