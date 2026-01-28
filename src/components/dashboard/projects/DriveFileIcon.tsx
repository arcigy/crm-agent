"use client";

import * as React from "react";
import {
  Folder,
  File,
  Cloud,
  FileText,
  Image as ImageIcon,
  FileCode,
  FolderClosed,
} from "lucide-react";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
}

export function DriveFileIcon({
  file,
  className = "w-8 h-8",
}: {
  file: DriveFile;
  className?: string;
}) {
  const isFolder = file.mimeType === "application/vnd.google-apps.folder";

  if (isFolder) {
    return (
      <Folder className={`${className} text-amber-500 fill-amber-500/20`} />
    );
  }

  const mime = file.mimeType.toLowerCase();
  if (mime.includes("pdf"))
    return <FileText className={`${className} text-red-500`} />;
  if (mime.includes("image"))
    return <ImageIcon className={`${className} text-orange-500`} />;
  if (mime.includes("spreadsheet") || mime.includes("excel"))
    return <FileText className={`${className} text-emerald-500`} />;
  if (mime.includes("presentation") || mime.includes("powerpoint"))
    return <FileText className={`${className} text-amber-600`} />;
  if (
    mime.includes("javascript") ||
    mime.includes("typescript") ||
    mime.includes("json") ||
    mime.includes("code")
  )
    return <FileCode className={`${className} text-blue-500`} />;

  return <File className={`${className} text-gray-400`} />;
}
