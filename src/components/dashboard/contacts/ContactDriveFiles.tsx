"use client";

import * as React from "react";
import { ExternalLink, FolderKanban } from "lucide-react";
import { Lead } from "@/types/contact";

export function ContactDriveFiles({ contact }: { contact: Lead }) {
  const [projectFiles, setProjectFiles] = React.useState<Record<number, any[]>>(
    {},
  );
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    const fetchFiles = async () => {
      if (!contact.projects?.length) return;
      setIsLoading(true);
      const filesMap: Record<number, any[]> = {};
      try {
        await Promise.all(
          contact.projects.map(async (p) => {
            if (p.drive_folder_id) {
              const res = await fetch(
                `/api/google/drive?folderId=${p.drive_folder_id}`,
              );
              const result = await res.json();
              if (result.isConnected && result.files)
                filesMap[p.id] = result.files;
            }
          }),
        );
        setProjectFiles(filesMap);
      } catch (err) {
        console.error("Drive fetch failed:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFiles();
  }, [contact]);

  return (
    <section className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">
        Projekty & Súbory
      </h3>
      <div className="space-y-6">
        {isLoading && (
          <div className="flex flex-col items-center py-4 gap-2">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-[9px] font-bold text-gray-400">
              Načítam Drive...
            </span>
          </div>
        )}

        {contact.projects?.map((p) => (
          <div key={p.id} className="space-y-2">
            <div className="flex items-center justify-between border-b border-gray-50 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-900 truncate max-w-[150px]">
                  {p.project_type}
                </p>
              </div>
              {p.drive_folder_id && (
                <a
                  href={`https://drive.google.com/drive/folders/${p.drive_folder_id}`}
                  target="_blank"
                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <div className="space-y-1.5 pl-2">
              {projectFiles[p.id]?.map((file: any) => (
                <div
                  key={file.id}
                  className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded-lg cursor-pointer group"
                  onClick={() => window.open(file.webViewLink, "_blank")}
                >
                  <div className="w-6 h-6 rounded bg-blue-50 flex items-center justify-center text-blue-600">
                    <FolderKanban className="w-3 h-3" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold text-gray-700 truncate group-hover:text-blue-600">
                      {file.name}
                    </p>
                  </div>
                </div>
              )) ||
                (!isLoading && (
                  <p className="text-[9px] text-gray-400 italic">
                    Prázdne alebo nepripojené
                  </p>
                ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
