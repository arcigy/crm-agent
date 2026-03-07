"use client";

import * as React from "react";
import {
  Folder,
  ChevronRight,
  ChevronDown,
  Loader2,
  ExternalLink,
  Search,
  Cloud,
  FileText,
  File,
} from "lucide-react";
import { DriveFileIcon } from "./DriveFileIcon";

interface FileNode {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  parents?: string[];
  children?: FileNode[];
}

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
}: DriveViewerProps) {
  const [rootNode, setRootNode] = React.useState<FileNode | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});

  // Initial load
  React.useEffect(() => {
    const loadProject = async () => {
      if (!folderId) return;

      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/google/drive?folderId=${folderId}&recursive=true`,
        );
        if (!res.ok) throw new Error("Fetch failed");
        const data = await res.json();

        if (data && data.isConnected && data.files) {
          const fileMap = new Map<string, FileNode>();

          // Create root node representing the project folder
          const projectRoot: FileNode = {
            id: folderId,
            name: projectName,
            mimeType: "application/vnd.google-apps.folder",
            children: [],
          };
          fileMap.set(folderId, projectRoot);

          // First pass: create all nodes
          data.files.forEach((file: any) => {
            fileMap.set(file.id, {
              id: file.id,
              name: file.name,
              mimeType: file.mimeType,
              webViewLink: file.webViewLink,
              parents: file.parents,
              children: [],
            });
          });

          // Second pass: build hierarchy
          data.files.forEach((file: any) => {
            const node = fileMap.get(file.id)!;
            const parentId = file.parents?.[0];

            if (parentId && fileMap.has(parentId)) {
              const parent = fileMap.get(parentId)!;
              if (!parent.children) parent.children = [];
              parent.children.push(node);
            }
          });

          const sortNodes = (nodes: FileNode[]) => {
            nodes.sort((a, b) => {
              const aIsFolder =
                a.mimeType === "application/vnd.google-apps.folder";
              const bIsFolder =
                b.mimeType === "application/vnd.google-apps.folder";
              if (aIsFolder && !bIsFolder) return -1;
              if (!aIsFolder && bIsFolder) return 1;
              return a.name.localeCompare(b.name);
            });
            nodes.forEach((node) => {
              if (node.children) sortNodes(node.children);
            });
          };

          const populatedRoot = fileMap.get(folderId);
          if (populatedRoot && populatedRoot.children) {
            sortNodes(populatedRoot.children);
            setRootNode(populatedRoot);
            setExpanded({ [folderId]: true });
          }
        }
      } catch (err) {
        console.error("Failed to load project files:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadProject();
  }, [folderId, projectName]);

  const toggleFolder = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderTree = (nodes: FileNode[], level: number = 0) => {
    return nodes.map((node) => {
      const isFolder = node.mimeType === "application/vnd.google-apps.folder";
      const isExpanded = expanded[node.id];
      const hasChildren = node.children && node.children.length > 0;

      return (
        <React.Fragment key={node.id}>
          <div
            onClick={() =>
              isFolder
                ? toggleFolder(node.id)
                : window.open(node.webViewLink, "_blank")
            }
            className={`
              group flex items-center gap-3 py-3 px-4 rounded-2xl cursor-pointer transition-all duration-200
              ${isFolder ? "hover:bg-white/[0.04]" : "hover:bg-violet-500/5"}
              border border-transparent hover:border-white/5 relative
            `}
            style={{ marginLeft: `${level * 20}px` }}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {isFolder ? (
                <>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isExpanded ? 'bg-violet-500/20 text-violet-400 border border-violet-500/20' : 'bg-white/5 text-zinc-400 border border-white/5'}`}>
                    <Folder className={`w-5 h-5 ${isExpanded ? 'fill-violet-400/20' : ''}`} />
                  </div>
                </>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-zinc-500">
                  <DriveFileIcon file={node} className="w-5 h-5" />
                </div>
              )}

              <div className="flex flex-col min-w-0">
                <span className={`text-sm font-black uppercase tracking-tight italic ${isFolder ? "text-white" : "text-zinc-400 group-hover:text-violet-400"} transition-colors truncate`}>
                  {node.name}
                </span>
                <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest leading-none">
                  {isFolder ? "Cloud_Folder" : node.mimeType.split('.').pop()?.toUpperCase() || "File_System"}
                </span>
              </div>
            </div>

            {isFolder && (
                 <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                    <ChevronDown className="w-4 h-4 text-zinc-600" />
                 </div>
            )}
            
            {!isFolder && (
              <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-40 transition-all text-violet-400" />
            )}
          </div>

          {isFolder && isExpanded && hasChildren && (
            <div className="mt-1">
              {renderTree(node.children!, level + 1)}
            </div>
          )}
        </React.Fragment>
      );
    });
  };

  return (
    <div className="h-full flex flex-col px-8 pb-8 pt-10 bg-transparent overflow-hidden">
      {/* Header - Neon Tech Style */}
      <div className="mb-10 flex items-center justify-between bg-zinc-900/40 backdrop-blur-xl border border-violet-500/10 px-8 py-5 rounded-[2rem] relative overflow-hidden shrink-0 shadow-lg shadow-black/20">
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-violet-600 opacity-10 rounded-full blur-[60px] pointer-events-none" />
        
        <div className="relative z-10">
          <h3 className="text-xl font-black text-zinc-100 uppercase tracking-tighter italic leading-none flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-500 shadow-[0_0_10px_#8b5cf6] animate-pulse" />
            VIRTUAL <span className="text-violet-500">VAULT</span>
          </h3>
          <p className="text-[8px] font-black text-violet-400/30 uppercase tracking-[0.4em] mt-1.5 ml-3.5">Secure_Encryption_Active</p>
        </div>

        <div className="relative z-10 flex items-center gap-6">
            <div className="flex flex-col items-end">
                <span className="text-[8px] font-black text-violet-500/50 uppercase tracking-widest">ID: FILE_STREAM_01</span>
                <span className="text-[11px] font-black text-white uppercase tracking-tight italic truncate max-w-[150px]">{projectName}</span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shadow-inner">
                <Cloud className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto thin-scrollbar pr-2 pb-10">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 text-violet-600 animate-spin" />
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest animate-pulse">
              SYNCING_DATA_STREAM...
            </p>
          </div>
        ) : !rootNode || !rootNode.children || rootNode.children.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
            <Folder className="w-16 h-16 text-zinc-800 mb-6" />
            <p className="text-sm font-black uppercase tracking-[0.3em] text-zinc-500 italic">
              Vault_Empty
            </p>
          </div>
        ) : (
          <div className="space-y-4">
               {renderTree(rootNode.children)}
          </div>
        )}
      </div>
    </div>
  );
}
