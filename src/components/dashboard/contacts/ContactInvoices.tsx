"use client";

import * as React from "react";
import {
  FileText,
  ExternalLink,
  Loader2,
  FolderOpen,
  AlertCircle,
} from "lucide-react";
import { Lead } from "@/types/contact";
import { toast } from "sonner";
import { DriveFileIcon } from "../projects/DriveFileIcon";

interface InvoiceFile {
  id: string;
  name: string;
  webViewLink: string;
  iconLink: string;
  modifiedTime: string;
  projectName: string;
  projectId: number;
}

export function ContactInvoices({ contact }: { contact: Lead }) {
  const [contractFiles, setContractFiles] = React.useState<InvoiceFile[]>([]);
  const [invoiceFiles, setInvoiceFiles] = React.useState<InvoiceFile[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchFilesFromFolder = async (
    folderId: string,
    projectName: string,
    projectId: number,
  ) => {
    try {
      const res = await fetch(`/api/google/drive?folderId=${folderId}`);
      const data = await res.json();

      if (!data.isConnected || !data.files) return [];

      return data.files
        .filter((f: any) => f.mimeType !== "application/vnd.google-apps.folder")
        .map((f: any) => ({
          ...f,
          projectName,
          projectId,
        }));
    } catch (err) {
      console.error(`Failed to fetch files from folder ${folderId}:`, err);
      return [];
    }
  };

  const fetchDocumentsForProject = async (
    projectId: number,
    folderId: string,
    projectName: string,
  ) => {
    try {
      console.log(`[Finance] Fetching for project: ${projectName}`);

      // 1. Get all folders in the project root
      const rootRes = await fetch(`/api/google/drive?folderId=${folderId}`);
      const rootData = await rootRes.json();

      if (!rootData.isConnected || !rootData.files) {
        console.log(`[Finance] No root files for ${projectName}`);
        return { zmluvy: [], faktury: [] };
      }

      console.log(
        `[Finance] Root folders:`,
        rootData.files.map((f: any) => f.name),
      );

      // 2. Find the "01_Zmluvy_a_Faktury" folder
      const financeFolder = rootData.files.find(
        (f: any) =>
          f.mimeType === "application/vnd.google-apps.folder" &&
          f.name.toLowerCase().includes("zmluvy") &&
          f.name.toLowerCase().includes("faktury"),
      );

      if (!financeFolder) {
        console.log(`[Finance] No finance folder found in ${projectName}`);
        return { zmluvy: [], faktury: [] };
      }

      console.log(`[Finance] Found finance folder: ${financeFolder.name}`);

      // 3. Get subfolders of "01_Zmluvy_a_Faktury"
      const subRes = await fetch(
        `/api/google/drive?folderId=${financeFolder.id}`,
      );
      const subData = await subRes.json();

      if (!subData.isConnected || !subData.files) {
        console.log(`[Finance] No subfolders in finance folder`);
        return { zmluvy: [], faktury: [] };
      }

      console.log(
        `[Finance] Subfolders:`,
        subData.files.map((f: any) => f.name),
      );

      // 4. Find "Zmluvy" and "Faktúry" subfolders
      const zmluvyFolder = subData.files.find(
        (f: any) =>
          f.mimeType === "application/vnd.google-apps.folder" &&
          f.name.toLowerCase().includes("zmluv") &&
          !f.name.toLowerCase().includes("faktur"),
      );

      const fakturyFolder = subData.files.find(
        (f: any) =>
          f.mimeType === "application/vnd.google-apps.folder" &&
          f.name.toLowerCase().includes("faktur"),
      );

      console.log(
        `[Finance] Zmluvy folder:`,
        zmluvyFolder?.name || "NOT FOUND",
      );
      console.log(
        `[Finance] Faktury folder:`,
        fakturyFolder?.name || "NOT FOUND",
      );

      // 5. Fetch files from each subfolder
      const zmluvyFiles = zmluvyFolder
        ? await fetchFilesFromFolder(zmluvyFolder.id, projectName, projectId)
        : [];

      const fakturyFiles = fakturyFolder
        ? await fetchFilesFromFolder(fakturyFolder.id, projectName, projectId)
        : [];

      console.log(
        `[Finance] Found ${zmluvyFiles.length} contracts, ${fakturyFiles.length} invoices`,
      );

      return { zmluvy: zmluvyFiles, faktury: fakturyFiles };
    } catch (err) {
      console.error(
        `Failed to fetch documents for project ${projectName}:`,
        err,
      );
      return { zmluvy: [], faktury: [] };
    }
  };

  React.useEffect(() => {
    const loadAllDocuments = async () => {
      setIsLoading(true);
      setError(null);

      try {
        let projectFolders: Array<{ id: string; name: string }> = [];

        // Strategy 1: Use linked projects from database
        if (contact.projects?.length) {
          console.log("[Finance] Using linked projects from database");
          projectFolders = contact.projects
            .filter((p) => p.drive_folder_id)
            .map((p) => ({
              id: p.drive_folder_id!,
              name: p.project_type || p.name || "Projekt",
            }));
        }

        // Strategy 2: Fallback - Search Drive by contact name
        if (projectFolders.length === 0) {
          console.log(
            "[Finance] No linked projects, searching Drive by contact name",
          );
          const contactName =
            `${contact.first_name || ""} ${contact.last_name || ""}`.trim();
          const searchRes = await fetch(
            `/api/google/drive?search=${encodeURIComponent(`Client: ${contactName}`)}`,
          );
          const searchResult = await searchRes.json();

          if (searchResult.isConnected && searchResult.files) {
            projectFolders = searchResult.files.map((f: any) => ({
              id: f.id,
              name: f.name,
            }));
          }
        }

        console.log(
          `[Finance] Found ${projectFolders.length} project folders to scan`,
        );

        if (projectFolders.length === 0) {
          setContractFiles([]);
          setInvoiceFiles([]);
          setIsLoading(false);
          return;
        }

        // Fetch documents from all project folders
        const results = await Promise.all(
          projectFolders.map((folder) =>
            fetchDocumentsForProject(0, folder.id, folder.name),
          ),
        );

        // Combine all zmluvy and faktury from all projects
        const allZmluvy: InvoiceFile[] = [];
        const allFaktury: InvoiceFile[] = [];

        results.forEach((result) => {
          allZmluvy.push(...result.zmluvy);
          allFaktury.push(...result.faktury);
        });

        // Remove duplicates
        const uniqueZmluvy = allZmluvy.filter(
          (v, i, a) => a.findIndex((t) => t.id === v.id) === i,
        );
        const uniqueFaktury = allFaktury.filter(
          (v, i, a) => a.findIndex((t) => t.id === v.id) === i,
        );

        // Sort by modified time (newest first)
        const sorter = (a: any, b: any) =>
          new Date(b.modifiedTime).getTime() -
          new Date(a.modifiedTime).getTime();
        uniqueZmluvy.sort(sorter);
        uniqueFaktury.sort(sorter);

        console.log(
          `[Finance] Final: ${uniqueZmluvy.length} contracts, ${uniqueFaktury.length} invoices`,
        );

        setContractFiles(uniqueZmluvy);
        setInvoiceFiles(uniqueFaktury);
      } catch (err) {
        console.error("[Finance] Error loading documents:", err);
        setError("Nepodarilo sa načítať dokumenty z Google Drive.");
        toast.error("Chyba pri načítaní dokumentov");
      } finally {
        setIsLoading(false);
      }
    };

    loadAllDocuments();
  }, [contact]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-zinc-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-sm font-bold uppercase tracking-widest animate-pulse">
          Prehľadávam dokumenty...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-red-500/50">
        <AlertCircle className="w-8 h-8" />
        <p className="text-xs font-black uppercase tracking-widest">{error}</p>
      </div>
    );
  }

  const hasNoDocs = contractFiles.length === 0 && invoiceFiles.length === 0;

  if (hasNoDocs) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-zinc-300 dark:text-zinc-700">
        <div className="w-16 h-16 rounded-full border-2 border-dashed border-current flex items-center justify-center">
          <FileText className="w-8 h-8" />
        </div>
        <div className="text-center px-8">
          <p className="text-sm font-black uppercase tracking-widest mb-1">
            Žiadne finančné dokumenty
          </p>
          <p className="text-[10px] font-bold opacity-50 max-w-[250px] mx-auto">
            V priečinkoch so zmluvami a faktúrami neboli nájdené žiadne súbory.
          </p>
        </div>
      </div>
    );
  }

  const FileItem = ({ file }: { file: InvoiceFile }) => (
    <div
      key={file.id}
      className="group flex items-center gap-4 p-4 bg-white dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/5 transition-all cursor-pointer"
      onClick={() => window.open(file.webViewLink, "_blank")}
    >
      <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110">
        <DriveFileIcon
          file={{
            id: file.id,
            name: file.name,
            mimeType: file.mimeType || "application/octet-stream",
          }}
          className="w-10 h-10"
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-black text-foreground truncate group-hover:text-blue-600 transition-colors">
            {file.name}
          </p>
          <div className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-[9px] font-black uppercase text-blue-600 tracking-wider h-fit">
            DOC
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-tight">
            <FolderOpen className="w-3 h-3 text-zinc-300" />
            {file.projectName}
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800" />
          <span className="text-[9px] font-bold text-zinc-400">
            {new Date(file.modifiedTime).toLocaleDateString("sk-SK", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-zinc-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
        <ExternalLink className="w-4 h-4" />
      </div>
    </div>
  );

  return (
    <div className="p-8 animate-in fade-in slide-in-from-bottom-2 duration-500 flex flex-col gap-10">
      {/* Section: Zmluvy */}
      {contractFiles.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
              <FileText className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-black text-foreground uppercase tracking-widest italic">
              Zmluvy a kontrakty
            </h4>
            <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800/50" />
            <span className="text-[10px] font-black text-amber-500 bg-amber-500/5 px-2 py-0.5 rounded-full border border-amber-500/10">
              {contractFiles.length}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {contractFiles.map((f) => (
              <FileItem key={f.id} file={f} />
            ))}
          </div>
        </div>
      )}

      {/* Section: Faktúry */}
      {invoiceFiles.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-600">
              <FileText className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-black text-foreground uppercase tracking-widest italic">
              Faktúry a finančné doklady
            </h4>
            <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800/50" />
            <span className="text-[10px] font-black text-blue-600 bg-blue-600/5 px-2 py-0.5 rounded-full border border-blue-600/10">
              {invoiceFiles.length}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {invoiceFiles.map((f) => (
              <FileItem key={f.id} file={f} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 p-6 bg-zinc-50 dark:bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center">
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
          Zmluvy z priečinka "Zmluvy" a faktúry z priečinka "Faktúry" v rámci
          "01_Zmluvy_a_Faktury"
        </p>
      </div>
    </div>
  );
}
