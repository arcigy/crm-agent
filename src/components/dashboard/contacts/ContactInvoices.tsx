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

  const fetchInvoicesForProject = async (
    projectId: number,
    folderId: string,
    projectName: string,
  ) => {
    // We'll search for files that are inside folders containing these names
    const keywords = [
      "faktury",
      "faktúry",
      "invoices",
      "zmluvy",
      "zmluva",
      "contract",
    ];

    try {
      const res = await fetch(
        `/api/google/drive?folderId=${folderId}&recursive=true`,
      );
      const result = await res.json();

      if (result.isConnected && result.files) {
        return result.files
          .filter((f: any) => {
            const isFile = f.mimeType !== "application/vnd.google-apps.folder";
            const pathLower = (f.path || "").toLowerCase();
            const nameLower = (f.name || "").toLowerCase();
            const hasKeyword = keywords.some(
              (keyword) =>
                pathLower.includes(keyword) || nameLower.includes(keyword),
            );
            return isFile && hasKeyword;
          })
          .map((f: any) => ({
            ...f,
            projectName,
            projectId,
          }));
      }
      return [];
    } catch (err) {
      console.error(`Failed to fetch for project ${projectName}:`, err);
      return [];
    }
  };

  React.useEffect(() => {
    const loadAllDocuments = async () => {
      if (!contact.projects?.length) {
        setContractFiles([]);
        setInvoiceFiles([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const results = await Promise.all(
          contact.projects.map((p) => {
            if (p.drive_folder_id) {
              return fetchInvoicesForProject(
                p.id,
                p.drive_folder_id,
                p.project_type,
              );
            }
            return Promise.resolve([]);
          }),
        );

        const flattened = results.flat();
        const unique = flattened.filter(
          (v, i, a) => a.findIndex((t) => t.id === v.id) === i,
        );

        // Categorize
        const zmluvy: InvoiceFile[] = [];
        const faktury: InvoiceFile[] = [];

        unique.forEach((f) => {
          const lower = (f.name + (f as any).path).toLowerCase();
          if (lower.includes("zmluv") || lower.includes("contract")) {
            zmluvy.push(f);
          } else {
            faktury.push(f);
          }
        });

        // Sort by modified time (newest first)
        const sorter = (a: any, b: any) =>
          new Date(b.modifiedTime).getTime() -
          new Date(a.modifiedTime).getTime();
        zmluvy.sort(sorter);
        faktury.sort(sorter);

        setContractFiles(zmluvy);
        setInvoiceFiles(faktury);
      } catch (err) {
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
      <div className="w-12 h-12 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors overflow-hidden">
        {file.iconLink ? (
          <img
            src={file.iconLink}
            alt="icon"
            className="w-6 h-6 opacity-70 group-hover:invert group-hover:brightness-0 group-hover:contrast-200"
          />
        ) : (
          <FileText className="w-6 h-6" />
        )}
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
          Všetky údaje sú načítané z Google Drive priečinka
          "01_Zmluvy_a_Faktury"
        </p>
      </div>
    </div>
  );
}
