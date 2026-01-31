"use client";

import * as React from "react";
import {
  Folder,
  ChevronRight,
  ChevronDown,
  Loader2,
  ExternalLink,
  FileText,
  Search,
} from "lucide-react";
import { Lead } from "@/types/contact";
import { DriveFileIcon } from "./DriveFileIcon";

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

  const toggleFolder = async (id: string) => {
    const isExpanding = !expanded[id];
    setExpanded((prev) => ({ ...prev, [id]: isExpanding }));

    if (isExpanding && !contents[id]) {
      setLoadingNodes((prev) => ({ ...prev, [id]: true }));
      try {
        const res = await fetch(`/api/google/drive?folderId=${id}`);
        const data = await res.json();
        setContents((prev) => ({ ...prev, [id]: data.files || [] }));
      } catch (err) {
        console.error("Fetch children failed:", err);
      } finally {
        setLoadingNodes((prev) => ({ ...prev, [id]: false }));
      }
    }
  };

  const renderTree = (nodes: FileNode[], level: number = 0) => {
    return nodes.map((node) => {
      const isFolder = node.mimeType === "application/vnd.google-apps.folder";
      const isExpanded = expanded[node.id];
      const isLoadingNode = loadingNodes[node.id];
      const nodeChildren = contents[node.id];

      return (
        <React.Fragment key={node.id}>
          <div
            onClick={() =>
              isFolder
                ? toggleFolder(node.id)
                : window.open(node.webViewLink, "_blank")
            }
            className={`
              group flex items-center gap-2 py-1.5 px-3 rounded-lg cursor-pointer transition-all
              hover:bg-muted/50 border border-transparent hover:border-border/50
              ${level === 0 ? "mt-4 first:mt-0" : ""}
            `}
            style={{ paddingLeft: `${level * 16 + 12}px` }}
          >
            {/* Indentation line for nested items */}
            {level > 0 && (
              <div
                className="absolute left-0 w-px h-full bg-border/40 group-hover:bg-blue-500/30"
                style={{ left: `${level * 16 - 2}px` }}
              />
            )}

            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {isFolder ? (
                <>
                  {isLoadingNode ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500 shrink-0" />
                  ) : isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  )}
                  <DriveFileIcon file={node} className="w-4 h-4 shrink-0" />
                </>
              ) : (
                <>
                  <div className="w-3.5 h-3.5 shrink-0" />{" "}
                  {/* Spacer for alignment with folders */}
                  <DriveFileIcon file={node} className="w-4 h-4 shrink-0" />
                </>
              )}

              <span
                className={`
                text-[13px] truncate transition-colors font-medium
                ${isFolder ? "text-foreground" : "text-muted-foreground group-hover:text-blue-500"}
                ${level === 0 ? "font-black uppercase tracking-tight text-[11px] text-blue-600" : ""}
              `}
              >
                {node.name}
              </span>
            </div>

            {!isFolder && (
              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity" />
            )}
          </div>

          {isFolder && isExpanded && nodeChildren && (
            <div className="relative">
              {renderTree(nodeChildren, level + 1)}
            </div>
          )}

          {isFolder && isExpanded && !nodeChildren && !isLoadingNode && (
            <div
              className="text-[10px] italic text-muted-foreground/60 py-1"
              style={{ paddingLeft: `${(level + 1) * 16 + 28}px` }}
            >
              Priečinok je prázdny
            </div>
          )}
        </React.Fragment>
      );
    });
  };

  return (
    <div className="h-full flex flex-col p-8 custom-scrollbar overflow-y-auto bg-card/30">
      <div className="mb-10 flex items-end justify-between border-b border-border pb-6">
        <div>
          <h3 className="text-2xl font-black text-foreground uppercase tracking-tight italic leading-none">
            Google <span className="text-blue-600">Explorer</span>
          </h3>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-2 opacity-70">
            Projektová štruktúra a dokumentácia
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
            <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">
              Live Sync
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              PRIPÁJAM SA K DRIVE...
            </p>
          </div>
        ) : roots.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
            <div className="w-20 h-20 bg-muted rounded-[2rem] flex items-center justify-center text-4xl mb-4 grayscale">
              📁
            </div>
            <p className="text-sm font-black uppercase tracking-widest text-foreground">
              Žiadne prepojené projekty
            </p>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-2">
              Chýba tag "Client: {contact.first_name} {contact.last_name}" v
              popise
            </p>
          </div>
        ) : (
          <div className="bg-background/40 rounded-[2rem] border border-border p-6 shadow-inner relative overflow-hidden">
            {/* Subtle background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[80px] -mr-32 -mt-32 rounded-full" />

            <div className="relative z-10">{renderTree(roots)}</div>
          </div>
        )}
      </div>

      <div className="mt-8 pt-6 border-t border-border flex justify-between items-center px-4">
        <div className="flex items-center gap-1.5 grayscale opacity-50">
          <Folder className="w-3.5 h-3.5" />
          <Search className="w-3.5 h-3.5" />
          <span className="text-[9px] font-black uppercase tracking-widest">
            IDE Interface v2.0
          </span>
        </div>
        <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest">
          Automatické priraďovanie podľa metadát
        </p>
      </div>
    </div>
  );
}
