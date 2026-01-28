"use client";

import * as React from "react";
import {
  Download,
  ExternalLink,
  Cloud,
  Copy,
  Scissors,
  File,
  X,
  Folder,
  Clipboard,
} from "lucide-react";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
}

interface DriveContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  file: DriveFile | null;
  clipboard: { op: "copy" | "cut"; file: DriveFile } | null;
  onDownload: (file: DriveFile) => void;
  onOpen: (file: DriveFile) => void;
  onCopy: (file: DriveFile) => void;
  onCut: (file: DriveFile) => void;
  onRename: (file: DriveFile) => void;
  onDelete: (file: DriveFile) => void;
  onPaste: () => void;
  onClose: () => void;
}

export function DriveContextMenu({
  visible,
  x,
  y,
  file,
  clipboard,
  onDownload,
  onOpen,
  onCopy,
  onCut,
  onRename,
  onDelete,
  onPaste,
  onClose,
}: DriveContextMenuProps) {
  if (!visible) return null;

  if (!file) {
    return (
      <div
        className="fixed bg-white rounded-xl shadow-2xl border border-gray-100 p-2 z-[200] min-w-[220px] animate-in fade-in zoom-in-95 duration-200"
        style={{ top: y, left: x }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onPaste}
          disabled={!clipboard}
          className="w-full text-left px-3 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-lg transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Clipboard className="w-4 h-4 text-gray-400" /> Vložiť
          {clipboard && (
            <span className="text-[9px] text-gray-400 ml-auto uppercase tracking-widest">
              {clipboard.op}
            </span>
          )}
        </button>
      </div>
    );
  }

  const isFolder = file.mimeType === "application/vnd.google-apps.folder";

  return (
    <div
      className="fixed bg-white rounded-xl shadow-2xl border border-gray-100 p-2 z-[200] min-w-[220px] animate-in fade-in zoom-in-95 duration-200"
      style={{ top: y, left: x }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3 py-2 border-b border-gray-50 mb-1 truncate max-w-[200px] flex items-center gap-2">
        {isFolder ? (
          <Folder className="w-3 h-3" />
        ) : (
          <File className="w-3 h-3" />
        )}
        <span className="truncate">{file.name}</span>
      </div>

      <button
        onClick={() => onDownload(file)}
        className="w-full text-left px-3 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-lg transition-colors flex items-center gap-3"
      >
        <Download className="w-4 h-4 text-gray-400" /> Stiahnuť
      </button>

      <div className="h-px bg-gray-100 my-1" />

      <button
        onClick={() => onOpen(file)}
        className="w-full text-left px-3 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-lg transition-colors flex items-center gap-3"
      >
        <ExternalLink className="w-4 h-4 text-gray-400" /> Otvoriť
      </button>

      <button
        onClick={() => {
          window.open(file.webViewLink, "_blank");
          onClose();
        }}
        className="w-full text-left px-3 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-lg transition-colors flex items-center gap-3"
      >
        <Cloud className="w-4 h-4 text-gray-400" /> Otvoriť na Drive
      </button>

      <div className="h-px bg-gray-100 my-1" />

      <button
        onClick={() => onCopy(file)}
        className="w-full text-left px-3 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-lg transition-colors flex items-center gap-3"
      >
        <Copy className="w-4 h-4 text-gray-400" /> Kopírovať
      </button>

      <button
        onClick={() => onCut(file)}
        className="w-full text-left px-3 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-lg transition-colors flex items-center gap-3"
      >
        <Scissors className="w-4 h-4 text-gray-400" /> Vystrihnúť
      </button>

      <div className="h-px bg-gray-100 my-1" />

      <button
        onClick={() => onRename(file)}
        className="w-full text-left px-3 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-lg transition-colors flex items-center gap-3"
      >
        <File className="w-4 h-4 text-gray-400" /> Premenovať
      </button>

      <button
        onClick={() => onDelete(file)}
        className="w-full text-left px-3 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-3"
      >
        <X className="w-4 h-4 text-red-400" /> Vymazať
      </button>
    </div>
  );
}
