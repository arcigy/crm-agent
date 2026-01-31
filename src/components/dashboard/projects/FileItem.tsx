"use client";

import * as React from "react";
import { ExternalLink } from "lucide-react";
import { DriveFileIcon } from "./DriveFileIcon";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  iconLink: string;
  thumbnailLink?: string;
}

interface FileItemProps {
  file: DriveFile;
  index: number;
  isSelected: boolean;
  viewMode: "grid" | "list";
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

export function FileItem({
  file,
  isSelected,
  viewMode,
  onClick,
  onDoubleClick,
  onContextMenu,
}: FileItemProps) {
  const isFolder = file.mimeType === "application/vnd.google-apps.folder";

  if (viewMode === "grid") {
    return (
      <div
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
        className={`cursor-pointer group bg-card p-6 rounded-[2.5rem] border hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-500/10 transition-all flex flex-col items-center text-center gap-4 relative overflow-hidden select-none ${isSelected ? "border-blue-500 ring-4 ring-blue-500/10" : "border-border"}`}
      >
        <div
          className={`absolute top-0 left-0 w-full h-1 ${isSelected ? "bg-blue-500 opacity-100" : "bg-blue-600 opacity-0 group-hover:opacity-100"} transition-opacity`}
        ></div>
        <div
          className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-transform group-hover:scale-110 ${isFolder ? "bg-amber-500/10" : "bg-blue-500/10"} overflow-hidden`}
        >
          {isFolder ? (
            <DriveFileIcon file={file} className="w-8 h-8 text-amber-500" />
          ) : file.thumbnailLink ? (
            <img
              src={file.thumbnailLink}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <img src={file.iconLink} alt="" className="w-8 h-8" />
          )}
        </div>
        <div className="space-y-1 w-full px-2">
          <span className="text-xs font-black text-foreground block truncate w-full leading-tight capitalize italic">
            {file.name}
          </span>
        </div>
        {!isFolder && (
          <ExternalLink className="absolute bottom-4 right-4 w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
    );
  }

  return (
    <tr
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      className={`transition-colors cursor-pointer group select-none ${isSelected ? "bg-blue-500/10" : "hover:bg-blue-500/5 text-foreground"}`}
    >
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <DriveFileIcon file={file} className="w-5 h-5" />
          <span className="font-bold text-foreground text-sm truncate max-w-[300px]">
            {file.name}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 text-[10px] font-black uppercase text-muted-foreground tracking-widest italic">
        {isFolder ? "Priečinok" : "Súbor"}
      </td>
      <td className="px-6 py-4 text-xs font-medium text-muted-foreground">
        {/* Simplified for now, can pass date as prop if needed */}
        --
      </td>
      <td className="px-6 py-4 text-right">
        <button
          onClick={(e) => {
            e.stopPropagation();
            window.open(file.webViewLink, "_blank");
          }}
          className="p-2 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-all"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}
