"use client";

import * as React from "react";
import {
  Folder,
  File,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  FileCode,
  Video,
  Music,
  Archive,
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
  const name = file.name.toLowerCase();

  // PDF - Red
  if (mime.includes("pdf") || name.endsWith(".pdf")) {
    return (
      <div className={`${className} relative flex items-center justify-center`}>
        <div className="absolute inset-0 bg-red-500 rounded-lg opacity-10" />
        <FileText
          className="relative w-5/6 h-5/6 text-red-600"
          strokeWidth={2.5}
        />
      </div>
    );
  }

  // Images - Purple/Pink
  if (
    mime.includes("image") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".png") ||
    name.endsWith(".gif") ||
    name.endsWith(".svg") ||
    name.endsWith(".webp")
  ) {
    return (
      <div className={`${className} relative flex items-center justify-center`}>
        <div className="absolute inset-0 bg-purple-500 rounded-lg opacity-10" />
        <ImageIcon
          className="relative w-5/6 h-5/6 text-purple-600"
          strokeWidth={2.5}
        />
      </div>
    );
  }

  // Excel/Spreadsheets - Green
  if (
    mime.includes("spreadsheet") ||
    mime.includes("excel") ||
    name.endsWith(".xlsx") ||
    name.endsWith(".xls") ||
    name.endsWith(".csv")
  ) {
    return (
      <div className={`${className} relative flex items-center justify-center`}>
        <div className="absolute inset-0 bg-emerald-500 rounded-lg opacity-10" />
        <FileSpreadsheet
          className="relative w-5/6 h-5/6 text-emerald-600"
          strokeWidth={2.5}
        />
      </div>
    );
  }

  // Word Documents - Blue
  if (
    mime.includes("document") ||
    mime.includes("word") ||
    name.endsWith(".docx") ||
    name.endsWith(".doc")
  ) {
    return (
      <div className={`${className} relative flex items-center justify-center`}>
        <div className="absolute inset-0 bg-blue-500 rounded-lg opacity-10" />
        <FileText
          className="relative w-5/6 h-5/6 text-blue-600"
          strokeWidth={2.5}
        />
      </div>
    );
  }

  // PowerPoint - Orange
  if (
    mime.includes("presentation") ||
    mime.includes("powerpoint") ||
    name.endsWith(".pptx") ||
    name.endsWith(".ppt")
  ) {
    return (
      <div className={`${className} relative flex items-center justify-center`}>
        <div className="absolute inset-0 bg-orange-500 rounded-lg opacity-10" />
        <FileText
          className="relative w-5/6 h-5/6 text-orange-600"
          strokeWidth={2.5}
        />
      </div>
    );
  }

  // Code files - Cyan
  if (
    mime.includes("javascript") ||
    mime.includes("typescript") ||
    mime.includes("json") ||
    mime.includes("code") ||
    name.endsWith(".js") ||
    name.endsWith(".ts") ||
    name.endsWith(".tsx") ||
    name.endsWith(".jsx") ||
    name.endsWith(".json") ||
    name.endsWith(".html") ||
    name.endsWith(".css")
  ) {
    return (
      <div className={`${className} relative flex items-center justify-center`}>
        <div className="absolute inset-0 bg-cyan-500 rounded-lg opacity-10" />
        <FileCode
          className="relative w-5/6 h-5/6 text-cyan-600"
          strokeWidth={2.5}
        />
      </div>
    );
  }

  // Video - Pink
  if (
    mime.includes("video") ||
    name.endsWith(".mp4") ||
    name.endsWith(".mov") ||
    name.endsWith(".avi") ||
    name.endsWith(".mkv")
  ) {
    return (
      <div className={`${className} relative flex items-center justify-center`}>
        <div className="absolute inset-0 bg-pink-500 rounded-lg opacity-10" />
        <Video
          className="relative w-5/6 h-5/6 text-pink-600"
          strokeWidth={2.5}
        />
      </div>
    );
  }

  // Audio - Indigo
  if (
    mime.includes("audio") ||
    name.endsWith(".mp3") ||
    name.endsWith(".wav") ||
    name.endsWith(".m4a")
  ) {
    return (
      <div className={`${className} relative flex items-center justify-center`}>
        <div className="absolute inset-0 bg-indigo-500 rounded-lg opacity-10" />
        <Music
          className="relative w-5/6 h-5/6 text-indigo-600"
          strokeWidth={2.5}
        />
      </div>
    );
  }

  // Archives - Yellow
  if (
    mime.includes("zip") ||
    mime.includes("archive") ||
    name.endsWith(".zip") ||
    name.endsWith(".rar") ||
    name.endsWith(".7z")
  ) {
    return (
      <div className={`${className} relative flex items-center justify-center`}>
        <div className="absolute inset-0 bg-yellow-500 rounded-lg opacity-10" />
        <Archive
          className="relative w-5/6 h-5/6 text-yellow-600"
          strokeWidth={2.5}
        />
      </div>
    );
  }

  // Default - Gray
  return (
    <div className={`${className} relative flex items-center justify-center`}>
      <div className="absolute inset-0 bg-zinc-400 rounded-lg opacity-10" />
      <File className="relative w-5/6 h-5/6 text-zinc-500" strokeWidth={2.5} />
    </div>
  );
}
