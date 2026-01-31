"use client";

import * as React from "react";
import { toast } from "sonner";

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  iconLink: string;
  thumbnailLink?: string;
  webContentLink?: string;
  modifiedTime?: string;
}

export function useDriveFiles(
  projectId: number,
  projectName: string,
  folderId?: string,
  subfolderName?: string,
  options: { recursive?: boolean; isOpen?: boolean } = {},
) {
  const [files, setFiles] = React.useState<DriveFile[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [currentFolderId, setCurrentFolderId] = React.useState<
    string | undefined
  >(folderId);
  const [folderHistory, setFolderHistory] = React.useState<
    { id: string; name: string }[]
  >([]);
  const [isUploading, setIsUploading] = React.useState(false);

  const isRecursive = !!options.recursive;
  const isOpen = !!options.isOpen;

  const fetchFiles = React.useCallback(
    async (targetId?: string) => {
      setLoading(true);
      try {
        // Use provided targetId, or fall back to state/props
        const idToFetch = targetId || currentFolderId || folderId;
        const isInitialLoad = !targetId && !currentFolderId;

        let url = idToFetch
          ? `/api/google/drive?folderId=${idToFetch}`
          : `/api/google/drive?projectName=${encodeURIComponent(projectName)}`;

        if (subfolderName && isInitialLoad && !targetId && !currentFolderId) {
          url += `&subfolderName=${encodeURIComponent(subfolderName)}`;
        }

        if (isRecursive) {
          url += `&recursive=true`;
        }

        const res = await fetch(url);
        const data = await res.json();

        if (data.isConnected) {
          setFiles(data.files || []);
        } else {
          toast.error("Google Drive nie je prepojený");
        }
      } catch (error) {
        console.error("Fetch files failed:", error);
      } finally {
        setLoading(false);
      }
    },
    [projectName, subfolderName, isRecursive, folderId, currentFolderId],
  );

  const lastOpenRef = React.useRef(false);

  // Auto-fetch on open
  React.useEffect(() => {
    if (isOpen && !lastOpenRef.current) {
      setCurrentFolderId(folderId);
      setFolderHistory([]);
      fetchFiles(folderId);
    }
    lastOpenRef.current = isOpen;
  }, [isOpen, folderId, fetchFiles]);

  const deleteFile = async (fileId: string, name: string) => {
    if (!confirm(`Naozaj chcete vymazať ${name}?`)) return false;
    const toastId = toast.loading("Vymazávam...");
    try {
      const res = await fetch(`/api/google/drive?fileId=${fileId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Súbor vymazaný", { id: toastId });
        fetchFiles();
        return true;
      }
      throw new Error("Delete failed");
    } catch (e) {
      toast.error("Chyba pri mazaní", { id: toastId });
      return false;
    }
  };

  const renameFile = async (fileId: string, oldName: string) => {
    const newName = prompt("Zadajte nový názov:", oldName);
    if (!newName || newName === oldName) return false;
    const toastId = toast.loading("Premenovávam...");
    try {
      const res = await fetch(`/api/google/drive`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, name: newName }),
      });
      if (res.ok) {
        toast.success("Súbor premenovaný", { id: toastId });
        fetchFiles();
        return true;
      }
      throw new Error("Rename failed");
    } catch (e) {
      toast.error("Chyba pri premenovávaní", { id: toastId });
      return false;
    }
  };

  const performClipboardAction = async (
    action: "copy" | "move" | "cut",
    fileId: string,
    targetId: string,
  ) => {
    const op = action === "cut" ? "move" : action;
    const toastId = toast.loading(
      op === "move" ? "Presúvam..." : "Kopírujem...",
    );

    try {
      const body =
        action === "copy"
          ? {
              action: "copy",
              copyFileId: fileId,
              parentId: targetId,
              name: `Kópia`,
            }
          : { action: "move", fileId, destinationId: targetId };

      const res = await fetch("/api/google/drive", {
        method: action === "copy" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(
          action === "copy" ? "Súbor skopírovaný" : "Súbor presunutý",
          { id: toastId },
        );
        fetchFiles();
        return true;
      }
      throw new Error("Action failed");
    } catch (error) {
      toast.error("Chyba pri operácii", { id: toastId });
      return false;
    }
  };

  return {
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
  };
}
