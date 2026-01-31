"use client";

import * as React from "react";
import { Folder, Search, Loader2 } from "lucide-react";
import { Lead } from "@/types/contact";
import { ProjectDriveModal } from "../ProjectDriveModal";

export function ContactDocuments({ contact }: { contact: Lead }) {
  const [projectsData, setProjectsData] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedFolder, setSelectedFolder] = React.useState<{
    id: string;
    name: string;
  } | null>(null);

  React.useEffect(() => {
    const fetchFoldersAndChildren = async () => {
      setIsLoading(true);
      try {
        const contactName =
          `${contact.first_name || ""} ${contact.last_name || ""}`.trim();

        // 1. First approach: Search by description tag "Client: Name"
        const searchRes = await fetch(
          `/api/google/drive?search=${encodeURIComponent(`Client: ${contactName}`)}`,
        );
        const searchResult = await searchRes.json();

        let folders = searchResult.files || [];

        // 2. Second approach (Fallback): If search returned nothing,
        // try to catch projects that are already linked in the database
        if (folders.length === 0 && contact.projects?.length) {
          folders = contact.projects
            .filter((p) => p.drive_folder_id)
            .map((p) => ({
              id: p.drive_folder_id,
              name: p.project_type || p.name || "Projekt",
              mimeType: "application/vnd.google-apps.folder",
            }));
        }

        // 3. For all found folders, fetch their direct children (subfolders)
        if (folders.length > 0) {
          const enriched = await Promise.all(
            folders.map(async (folder: any) => {
              try {
                const childRes = await fetch(
                  `/api/google/drive?folderId=${folder.id}`,
                );
                const childData = await childRes.json();
                return {
                  ...folder,
                  subfolders: (childData.files || []).filter((f: any) =>
                    f.mimeType.includes("folder"),
                  ),
                };
              } catch (e) {
                return { ...folder, subfolders: [] };
              }
            }),
          );
          setProjectsData(enriched);
        } else {
          setProjectsData([]);
        }
      } catch (err) {
        console.error("Fetch folders failed:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFoldersAndChildren();
  }, [contact]);

  return (
    <div className="h-full flex flex-col p-8 custom-scrollbar overflow-y-auto">
      <div className="mb-8">
        <h3 className="text-xl font-black text-foreground uppercase tracking-tight">
          Projektová Dokumentácia
        </h3>
        <p className="text-xs text-muted-foreground font-bold">
          Prehľad všetkých aktívnych projektov a ich štruktúry na Google Drive
        </p>
      </div>

      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            SYNCHRONIZUJEM DRIVE...
          </p>
        </div>
      ) : projectsData.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
          <div className="w-20 h-20 bg-muted rounded-[2rem] flex items-center justify-center text-4xl mb-4">
            📁
          </div>
          <p className="text-sm font-black uppercase tracking-widest text-foreground">
            Žiadne prepojené projekty nenájdené
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {projectsData.map((project) => (
            <div key={project.id} className="space-y-4">
              {/* Project Header Group */}
              <div className="flex items-center gap-4 border-b border-border pb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                  <Folder className="w-5 h-5 fill-current/20" />
                </div>
                <div>
                  <h4 className="text-base font-black text-foreground uppercase tracking-tight">
                    {project.name}
                  </h4>
                  <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">
                    HLAVNÝ PROJEKTOVÝ PRIEČINOK
                  </p>
                </div>
              </div>

              {/* Grid of Subfolders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {project.subfolders.map((sub: any) => (
                  <div
                    key={sub.id}
                    onClick={() =>
                      setSelectedFolder({ id: sub.id, name: sub.name })
                    }
                    className="group bg-card p-4 rounded-3xl border border-border hover:border-blue-500/50 hover:shadow-lg transition-all cursor-pointer flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                      <Folder className="w-5 h-5 fill-amber-500/20" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-black text-foreground truncate leading-tight">
                        {sub.name}
                      </p>
                      <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">
                        PODPRIEČINOK
                      </p>
                    </div>
                  </div>
                ))}

                {project.subfolders.length === 0 && (
                  <p className="text-[10px] text-muted-foreground italic col-span-full">
                    Projekt zatiaľ nemá žiadne podpriečinky.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedFolder && (
        <ProjectDriveModal
          key={selectedFolder.id}
          isOpen={!!selectedFolder}
          onClose={() => setSelectedFolder(null)}
          projectId={0}
          projectName={selectedFolder.name}
          folderId={selectedFolder.id}
        />
      )}
    </div>
  );
}
