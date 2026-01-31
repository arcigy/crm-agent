"use client";

import * as React from "react";
import { Folder, Search, Loader2 } from "lucide-react";
import { Lead } from "@/types/contact";
import { ProjectDriveModal } from "../ProjectDriveModal";

export function ContactDocuments({ contact }: { contact: Lead }) {
  const [projectFolders, setProjectFolders] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedProject, setSelectedProject] = React.useState<{
    id: string;
    name: string;
  } | null>(null);

  React.useEffect(() => {
    const searchFolders = async () => {
      setIsLoading(true);
      try {
        // Search by Client name in description as requested by user
        const searchTerm = `Client: ${contact.first_name} ${contact.last_name}`;
        const res = await fetch(
          `/api/google/drive?search=${encodeURIComponent(searchTerm)}`,
        );
        const result = await res.json();
        if (result.isConnected && result.files) {
          setProjectFolders(result.files);
        }
      } catch (err) {
        console.error("Search folders failed:", err);
      } finally {
        setIsLoading(false);
      }
    };
    searchFolders();
  }, [contact]);

  const filteredFolders = projectFolders.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="h-full flex flex-col p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-xl font-black text-foreground uppercase tracking-tight">
            Projektové Dokumenty
          </h3>
          <p className="text-xs text-muted-foreground font-bold">
            Všetky projekty na Google Drive prepojené s týmto kontaktom (podľa
            popisu)
          </p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Hľadať projekt..."
            className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-xl text-xs font-bold focus:border-blue-500 outline-none transition-all text-foreground"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            Prehľadávam Google Drive...
          </p>
        </div>
      ) : filteredFolders.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
          <div className="w-20 h-20 bg-muted rounded-[2rem] flex items-center justify-center text-4xl mb-4">
            📁
          </div>
          <p className="text-sm font-black uppercase tracking-widest text-foreground">
            Žiadne prepojené projekty nenájdené
          </p>
          <p className="text-[10px] text-muted-foreground font-bold max-w-[200px] mt-2">
            Uistite sa, že priečinky na Drive majú v popise "Client:{" "}
            {contact.first_name} {contact.last_name}"
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFolders.map((folder) => (
            <div
              key={folder.id}
              onClick={() =>
                setSelectedProject({ id: folder.id, name: folder.name })
              }
              className="group bg-card p-6 rounded-[2rem] border border-border hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/5 transition-all cursor-pointer flex items-center gap-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                <Folder className="w-7 h-7 fill-amber-500/20" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-black text-foreground truncate">
                  {folder.name}
                </h4>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Projektový Priečinok
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedProject && (
        <ProjectDriveModal
          key={selectedProject.id}
          isOpen={!!selectedProject}
          onClose={() => setSelectedProject(null)}
          projectId={0}
          projectName={selectedProject.name}
          folderId={selectedProject.id}
        />
      )}
    </div>
  );
}
