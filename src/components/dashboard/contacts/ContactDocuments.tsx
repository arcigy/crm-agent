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
} from "lucide-react";
import { Lead } from "@/types/contact";
import { DriveFileIcon } from "../projects/DriveFileIcon";

interface FileNode {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  parents?: string[];
  children?: FileNode[];
  isLoaded?: boolean;
}

export function ContactDocuments({ contact }: { contact: Lead }) {
  const [roots, setRoots] = React.useState<FileNode[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const [contents, setContents] = React.useState<Record<string, FileNode[]>>(
    {},
  );
  const [loadingNodes, setLoadingNodes] = React.useState<
    Record<string, boolean>
  >({});

  // Initial load of project root folders
  React.useEffect(() => {
    const fetchRoots = async () => {
      setIsLoading(true);
      try {
        const contactName =
          `${contact.first_name || ""} ${contact.last_name || ""}`.trim();
        const res = await fetch(
          `/api/google/drive?search=${encodeURIComponent(`Client: ${contactName}`)}`,
        );
        const result = await res.json();

        let folders = result.files || [];

        // Fallback to linked projects
        if (folders.length === 0 && contact.projects?.length) {
          folders = contact.projects
            .filter((p) => p.drive_folder_id)
            .map((p) => ({
              id: p.drive_folder_id,
              name: p.project_type || p.name || "Projekt",
              mimeType: "application/vnd.google-apps.folder",
            }));
        }

        setRoots(folders);
      } catch (err) {
        console.error("Fetch roots failed:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRoots();
  }, [contact]);

  // Load entire project structure recursively
  const loadProjectRecursive = async (projectId: string) => {
    if (contents[projectId]) {
      setExpanded((prev) => ({ ...prev, [projectId]: !prev[projectId] }));
      return;
    }

    setLoadingNodes((prev) => ({ ...prev, [projectId]: true }));
    try {
      const res = await fetch(
        `/api/google/drive?folderId=${projectId}&recursive=true`,
      );
      const data = await res.json();

      if (data.isConnected && data.files) {
        const fileMap = new Map<string, FileNode>();
        const rootChildren: FileNode[] = [];

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

        data.files.forEach((file: any) => {
          const node = fileMap.get(file.id)!;
          const parentId = file.parents?.[0];

          if (parentId === projectId) {
            rootChildren.push(node);
          } else if (parentId && fileMap.has(parentId)) {
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
        sortNodes(rootChildren);

        setContents((prev) => ({ ...prev, [projectId]: rootChildren }));
        setExpanded((prev) => ({ ...prev, [projectId]: true }));
      }
    } catch (err) {
      console.error("Failed to load project:", err);
    } finally {
      setLoadingNodes((prev) => ({ ...prev, [projectId]: false }));
    }
  };

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
              group flex items-center gap-3 py-2 px-3 rounded-xl cursor-pointer transition-all duration-200
              ${isFolder ? "hover:bg-violet-500/5 text-zinc-300" : "hover:bg-violet-500/10 text-zinc-400"}
              border border-transparent hover:border-violet-500/20 relative
            `}
            style={{ marginLeft: `${level * 20}px` }}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {isFolder ? (
                <>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isExpanded ? 'bg-violet-500/20 text-violet-400 border border-violet-500/20' : 'bg-white/5 text-zinc-500 border border-white/5'}`}>
                    <Folder className={`w-4 h-4 ${isExpanded ? 'fill-violet-400/20' : ''}`} />
                  </div>
                </>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-center text-zinc-500">
                  <DriveFileIcon file={node} className="w-4 h-4" />
                </div>
              )}

              <div className="flex flex-col min-w-0">
                <span className={`text-sm font-semibold ${isFolder ? "text-white" : "text-zinc-400 group-hover:text-violet-400"} transition-colors truncate`}>
                  {node.name}
                </span>
                <span className="text-[10px] font-medium text-zinc-500 leading-none mt-0.5">
                  {isFolder ? "Priečinok" : node.mimeType.split('.').pop()?.toUpperCase() || "Súbor"}
                </span>
              </div>
            </div>

            {isFolder && (
                 <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-600" />
                 </div>
            )}
            
            {!isFolder && (
              <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-40 transition-all text-violet-400" />
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
    <div className="h-full flex flex-col p-6 bg-transparent overflow-hidden">
      {/* Header - Violet Branding Style */}
      <div className="mb-6 flex items-center justify-between bg-slate-900 bg-opacity-50 backdrop-blur-lg border border-violet-900/30 p-6 rounded-2xl relative overflow-hidden shadow-lg">
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-violet-500 opacity-5 rounded-full blur-[50px] pointer-events-none" />
        
        <div className="relative z-10">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            Cloudový <span className="text-violet-400">Archív</span>
          </h3>
          <p className="text-[11px] font-semibold text-zinc-500 mt-1">
             {contact.first_name} {contact.last_name} — Dokumenty
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.1)] transition-transform hover:scale-105">
                <Cloud className="w-5 h-5" />
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto thin-scrollbar pr-2 pb-6">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest animate-pulse">
              Synchronizujem...
            </p>
          </div>
        ) : roots.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[400px] text-center p-12 relative overflow-hidden">
            {/* Subtle Neon Background Decorations */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
            
            <div className="relative z-10 flex flex-col items-center">
                <div className="w-20 h-20 bg-blue-500/10 rounded-[2rem] border border-blue-400/20 flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(59,130,246,0.15)] transition-transform hover:scale-110">
                  <Folder className="w-9 h-9 text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                </div>
                
                <h3 className="text-xl font-bold text-white mb-3 tracking-tight">
                  Digitálny archív je prázdny
                </h3>
                
                <p className="text-sm text-zinc-400 max-w-sm leading-relaxed font-medium">
                  Zdá sa, že v cloude neexistuje priečinok s menom tohto klienta. Skontrolujte nastavenia synchronizácie.
                </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {roots.map((project) => (
              <div key={project.id} className="bg-slate-900 bg-opacity-50 backdrop-blur-lg border border-violet-900/30 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-4 border-b border-white/5 pb-4 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-violet-500 flex items-center justify-center text-white shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-transform hover:rotate-6">
                      <Folder className="w-5 h-5 fill-current/20" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white">
                        {project.name}
                      </h4>
                      <p className="text-[10px] font-bold text-violet-400/80 uppercase tracking-wider mt-0.5">
                        HLAVNÝ PRIEČINOK
                      </p>
                    </div>
                  </div>

                  <div className="pl-2">
                    {!contents[project.id] && !loadingNodes[project.id] && !expanded[project.id] && (
                        <button
                          onClick={() => loadProjectRecursive(project.id)}
                          className="h-9 px-5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/10 transition-all active:scale-95 shadow-sm"
                        >
                          Načítať štruktúru priečinka
                        </button>
                      )}

                    {loadingNodes[project.id] && (
                      <div className="flex items-center gap-3 text-violet-400 py-4 animate-pulse">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-[11px] font-bold uppercase tracking-wider">Synchronizujem dáta...</span>
                      </div>
                    )}

                    {expanded[project.id] && contents[project.id] && (
                      <div className="space-y-1">
                        {renderTree(contents[project.id], 0)}
                      </div>
                    )}
                  </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Meta */}
      <div className="mt-2 pt-4 border-t border-white/5 flex justify-between items-center px-4 opacity-50">
        <div className="flex items-center gap-2.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
          <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
            Cloud Pipeline Online
          </span>
        </div>
        <div className="flex items-center gap-3">
             <Search className="w-3.5 h-3.5 text-zinc-600" />
             <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Global Index Active</span>
        </div>
      </div>
    </div>
  );
}
