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
import { FileItem } from "./projects/FileItem";
import { DriveContextMenu } from "./projects/DriveContextMenu";

interface ProjectDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  projectName: string;
  folderId?: string;
  subfolderName?: string;
}

export function ProjectDriveModal({
  isOpen,
  onClose,
  projectId,
  projectName,
  folderId,
  subfolderName,
}: ProjectDriveModalProps) {
  const driveOptions = React.useMemo(
    () => ({ recursive: true, isOpen }),
    [isOpen],
  );

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
  } = useDriveFiles(
    projectId,
    projectName,
    folderId,
    subfolderName,
    driveOptions,
  );

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

  if (!isOpen) return null;

  // Filter files based on current folder for recursive mode
  const currentViewFiles = React.useMemo(() => {
    const parentId = currentFolderId || folderId;
    if (!parentId) return files;

    // Filter files that have 'parentId' in their parents array
    return files.filter((f: any) => {
      if (!f || !f.parents || !Array.isArray(f.parents)) return false;
      return f.parents.includes(parentId);
    });
  }, [files, currentFolderId, folderId]);

  const filtered = React.useMemo(() => {
    // If searching, search in ALL files of the project (files already contains all in recursive mode)
    const sourceFiles = searchQuery ? files : currentViewFiles;
    return sourceFiles.filter((f) => {
      if (!f.name) return false;
      return f.name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [files, currentViewFiles, searchQuery]);

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
        formData.append("parentId", targetId);

        const res = await fetch("/api/google/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Upload failed");
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
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />
      <div className="bg-card w-full max-w-4xl h-[80vh] rounded-[3rem] shadow-2xl relative z-10 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-border">
        <Header
          projectName={projectName}
          subfolderName={subfolderName}
          folderHistory={folderHistory}
          onBack={() => {
            const newHistory = [...folderHistory];
            const prev = newHistory.pop();
            setFolderHistory(newHistory);
            setCurrentFolderId(prev?.id === "root" ? folderId : prev?.id);
          }}
          onClose={onClose}
        />

        <Toolbar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isUploading={isUploading}
          loading={loading}
          onUploadClick={() => fileInputRef.current?.click()}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />

        <div
          className="flex-1 overflow-y-auto p-8 custom-scrollbar relative"
          onClick={() => {
            setSelectedIds(new Set());
            setContextMenu({ ...contextMenu, visible: false });
          }}
        >
          {loading ? (
            <LoadingState />
          ) : filtered.length === 0 ? (
            <EmptyState searchQuery={searchQuery} />
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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
            <div className="bg-card rounded-[2rem] border border-border overflow-hidden shadow-sm transition-colors">
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
      </div>

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

function Header({
  projectName,
  subfolderName,
  folderHistory,
  onBack,
  onClose,
}: any) {
  return (
    <div className="p-8 border-b border-border flex items-center justify-between bg-gradient-to-r from-muted/50 to-card">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-500/20">
          <HardDrive className="w-7 h-7 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            {folderHistory.length > 0 && (
              <button
                onClick={onBack}
                className="p-1 hover:bg-muted rounded-lg mr-1"
              >
                <ArrowLeft className="w-5 h-5 text-muted-foreground transition-colors" />
              </button>
            )}
            {projectName}{" "}
            <span className="text-muted-foreground/30 mx-2">/</span>{" "}
            <span className="text-blue-600">
              {subfolderName
                ? subfolderName.replace(/^\d+_/, "").replace(/_/g, " ")
                : "Dokumenty"}
            </span>
          </h2>
        </div>
      </div>
      <button
        onClick={onClose}
        className="p-3 hover:bg-muted rounded-2xl transition-all"
      >
        <X className="w-6 h-6 text-muted-foreground" />
      </button>
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
}: any) {
  return (
    <div className="px-8 py-4 border-b border-border bg-card flex items-center gap-4 transition-colors">
      <div className="relative flex-1">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Hľadať v súboroch projektu..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-6 py-3 bg-muted/50 border border-border rounded-2xl text-sm font-bold focus:bg-card focus:border-blue-500 outline-none transition-all text-foreground"
        />
      </div>
      <button
        disabled={isUploading || loading}
        onClick={onUploadClick}
        className="bg-foreground text-background px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all shadow-lg active:scale-95 disabled:opacity-50"
      >
        {isUploading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Plus className="w-4 h-4" />
        )}{" "}
        {isUploading ? "Nahrávam..." : "Nahrať súbor"}
      </button>
      <div className="flex bg-muted p-1 rounded-xl transition-colors">
        <button
          onClick={() => setViewMode("grid")}
          className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-card text-blue-600 shadow-sm" : "text-muted-foreground"}`}
        >
          <Grid className="w-4 h-4" />
        </button>
        <button
          onClick={() => setViewMode("list")}
          className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-card text-blue-600 shadow-sm" : "text-muted-foreground"}`}
        >
          <ListIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
        Pripájam sa k Drive...
      </p>
    </div>
  );
}
function EmptyState({ searchQuery }: { searchQuery?: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
      <div className="w-20 h-20 bg-muted rounded-[2rem] flex items-center justify-center text-4xl mb-4">
        {searchQuery ? "🔍" : "📁"}
      </div>
      <p className="text-sm font-black uppercase tracking-widest text-foreground">
        {searchQuery ? "Nenašli sa žiadne zhody" : "Tento priečinok je prázdny"}
      </p>
    </div>
  );
}
function Footer({ count }: any) {
  return (
    <div className="p-6 border-t border-border bg-muted/30 flex justify-between items-center px-10 transition-colors">
      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
        {count} objektov
      </span>
      <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2 hover:underline">
        Otvoriť na Drive <ExternalLink className="w-3 h-3" />
      </button>
    </div>
  );
}
