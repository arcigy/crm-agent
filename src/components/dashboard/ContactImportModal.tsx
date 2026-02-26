"use client";

import { useState, useRef } from "react";
import {
  Upload,
  X,
  FileText,
  Check,
  AlertCircle,
  Cloud,
  ChevronRight,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";
import * as XLSX from "xlsx";

interface ContactImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = "upload" | "map" | "confirm";

export function ContactImportModal({
  isOpen,
  onClose,
  onSuccess,
}: ContactImportModalProps) {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [googleStatus, setGoogleStatus] = useState<"idle" | "loading">("idle");
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [showAllRows, setShowAllRows] = useState(false);
  const [showAllPreview, setShowAllPreview] = useState(false);
  const [mapping, setMapping] = useState<Record<string, string>>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    company: "",
  });
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [globalStatus, setGlobalStatus] = useState<"published" | "draft">(
    "published",
  );
  const [processedRows, setProcessedRows] = useState<any[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleGoogleImport = async () => {
    setGoogleStatus("loading");
    try {
      const { importGoogleContacts } = await import("@/app/actions/google-contacts");
      const res = await importGoogleContacts();

      if (res.success) {
        toast.success(`Google Sync: ${res.count} kontaktov importovaných.`);
        onSuccess();
        onClose();
      } else {
        toast.error("Google Import zlyhal: " + res.error);
      }
    } catch (e) {
      console.error(e);
      toast.error("Chyba komunikácie so serverom.");
    } finally {
      setGoogleStatus("idle");
    }
  };

  const processFile = async (selectedFile: File) => {
    const name = selectedFile.name.toLowerCase();
    if (name.endsWith(".vcf") || name.endsWith(".vcard")) {
      // vCard handling remains simple - auto parse
      const text = await selectedFile.text();
      const { parseVCard } = await import("@/lib/vcard-client");
      const parsed = parseVCard(text);
      if (parsed.length > 0) {
        setPreviewRows(parsed);
        setFile(selectedFile);
        setStep("confirm");
      } else {
        toast.error("Vcard neobsahuje platné kontakty");
      }
    } else if (name.endsWith(".csv")) {
      const text = await selectedFile.text();
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setHeaders(results.meta.fields || []);
          setPreviewRows(results.data.slice(0, 5));
          setFile(selectedFile);
          setStep("map");
          // Auto-detect mapping
          const newMapping = { ...mapping };
          (results.meta.fields || []).forEach((h) => {
            const low = h.toLowerCase();
            if (low.includes("first") || low.includes("meno"))
              newMapping.first_name = h;
            if (low.includes("last") || low.includes("priezvisko"))
              newMapping.last_name = h;
            if (low.includes("email") || low.includes("mail"))
              newMapping.email = h;
            if (
              low.includes("phone") ||
              low.includes("tel") ||
              low.includes("mobil")
            )
              newMapping.phone = h;
            if (
              low.includes("company") ||
              low.includes("firm") ||
              low.includes("org")
            )
              newMapping.company = h;
          });
          setMapping(newMapping);
          // Initialize selection and processed rows
          setSelectedRows(new Set(results.data.map((_, i) => i)));
          setProcessedRows(results.data);
        },
      });
    } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      const buffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(buffer);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data: any[] = XLSX.utils.sheet_to_json(sheet);
      if (data.length > 0) {
        const sheetHeaders = Object.keys(data[0]);
        setHeaders(sheetHeaders);
        setPreviewRows(data.slice(0, 5));
        setFile(selectedFile);
        setStep("map");
        setSelectedRows(new Set(data.map((_, i) => i)));
        setProcessedRows(data);
      }
    } else {
      toast.error("Nepodporovaný formát súboru");
    }
  };

  const handleImport = async () => {
    setIsUploading(true);
    try {
      let contactsToUpload: any[] = [];

      if (step === "map" && file) {
        // Re-parse the whole file and apply mapping
        const name = file.name.toLowerCase();
        let rawData: any[] = [];

        if (name.endsWith(".csv")) {
          const text = await file.text();
          const result = Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
          });
          rawData = result.data;
        } else {
          const buffer = await file.arrayBuffer();
          const workbook = XLSX.read(buffer);
          rawData = XLSX.utils.sheet_to_json(
            workbook.Sheets[workbook.SheetNames[0]],
          );
        }

        contactsToUpload = Array.from(selectedRows).map((index) => {
          const row = processedRows[index];
          return {
            first_name: row[mapping.first_name] || "",
            last_name: row[mapping.last_name] || "",
            email: row[mapping.email] || "",
            phone: row[mapping.phone] || "",
            company: row[mapping.company] || "",
            status: globalStatus,
          };
        });
      } else {
        contactsToUpload = previewRows;
      }

      const { bulkCreateContacts } = await import("@/app/actions/contacts");
      const res = await bulkCreateContacts(contactsToUpload);

      if (res.success) {
        toast.success(`Importovaných ${res.count} kontaktov.`);
        onSuccess();
        onClose();
      } else {
        toast.error("Import zlyhal: " + res.error);
      }
    } catch (e: any) {
      toast.error("Chyba: " + e.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0" onClick={onClose}></div>
        <div
        className={`bg-[#0a0a0c] w-full ${step === "map" ? "max-w-4xl" : "max-w-xl"} rounded-[2.5rem] shadow-2xl shadow-black overflow-hidden flex flex-col relative transform transition-all animate-in zoom-in-95 duration-500 border border-white/10`}
      >
        {/* Header */}
        <div className="px-10 py-10 border-b border-white/5 flex items-center justify-between bg-black/40">
          <div>
            <h3 className="font-[900] text-3xl text-white tracking-tighter uppercase italic leading-none">
              {step === "upload"
                ? "Import kontaktov"
                : step === "map"
                  ? "Priradenie stĺpcov"
                  : "Potvrdenie importu"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-3 bg-white/5 hover:bg-white text-white/40 hover:text-black transition-all rounded-full border border-white/10 shadow-2xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto max-h-[70vh]">
          {step === "upload" && (
            <div className="p-8 space-y-8">
              {/* Google Option */}
            <button
                onClick={handleGoogleImport}
                disabled={googleStatus === "loading"}
                className="w-full p-6 rounded-3xl bg-white/5 border border-white/10 hover:border-white/30 hover:bg-white/10 hover:shadow-2xl hover:shadow-black transition-all group relative overflow-hidden text-left"
              >
                <div className="relative z-10 flex items-center gap-6">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-black group-hover:scale-105 transition-all shadow-lg">
                    <Cloud className="w-8 h-8" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-[900] text-white text-2xl tracking-tighter uppercase italic leading-none">
                      Google Sync
                    </h4>
                    <p className="text-white/40 text-[11px] font-[900] uppercase tracking-[0.2em] mt-2">
                      Automatický import z vášho účtu
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white transition-colors">
                    <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-black group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </button>

              <div className="relative flex justify-center py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <span className="px-4 bg-[#0a0a0c] text-[11px] font-[900] text-white/20 uppercase tracking-[0.4em] relative z-10">
                  alebo nahrajte súbor
                </span>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/10 rounded-3xl p-12 flex flex-col items-center text-center cursor-pointer hover:border-white/40 hover:bg-white/5 transition-all group relative"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".vcf,.csv,.xlsx,.xls"
                  onChange={(e) =>
                    e.target.files?.[0] && processFile(e.target.files[0])
                  }
                />
                <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white mb-6 group-hover:bg-white group-hover:text-black transition-all shadow-sm">
                  <Upload className="w-10 h-10" />
                </div>
                <h4 className="text-3xl font-[900] text-white mb-2 tracking-tighter uppercase italic leading-none">
                  Nahrať súbor
                </h4>
                <p className="text-[12px] font-[900] text-white/30 uppercase tracking-[0.25em]">
                  vCard, CSV alebo XLSX
                </p>
              </div>
            </div>
          )}

          {step === "map" && (
            <div className="p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-[900] uppercase tracking-[0.3em] text-violet-400/50">
                      Priradenie polí
                    </h4>
                    <div className="flex items-center gap-4 bg-white/5 p-2 rounded-2xl border border-white/10">
                      <span className="text-[10px] font-[900] uppercase tracking-widest text-white/30 ml-2">
                        Importovať ako:
                      </span>
                      <select
                        value={globalStatus}
                        onChange={(e) => setGlobalStatus(e.target.value as any)}
                        className="bg-transparent border-none text-[10px] font-[900] uppercase tracking-widest outline-none text-white cursor-pointer"
                      >
                        <option value="published" className="bg-[#0a0a0c]">🟢 Aktívne</option>
                        <option value="draft" className="bg-[#0a0a0c]">🟡 Draft</option>
                      </select>
                    </div>
                  </div>
                  {Object.keys(mapping).map((field) => (
                    <div key={field} className="space-y-2">
                      <label className="block text-[11px] font-[900] uppercase tracking-widest text-white/30 ml-1">
                        {field.replace("_", " ")}
                      </label>
                      <select
                        value={mapping[field]}
                        onChange={(e) =>
                          setMapping({ ...mapping, [field]: e.target.value })
                        }
                        className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-5 font-[900] text-sm focus:border-violet-500 transition-all outline-none text-white appearance-none cursor-pointer"
                      >
                        <option value="" className="bg-[#0a0a0c]">-- Vynechať --</option>
                        {headers.map((h) => (
                          <option key={h} value={h} className="bg-[#0a0a0c]">
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-[900] uppercase tracking-[0.3em] text-violet-400/50">
                      Výber a náhľad ({selectedRows.size}/{processedRows.length}
                      )
                    </h4>
                    <button
                      onClick={() => {
                        if (selectedRows.size === processedRows.length)
                          setSelectedRows(new Set());
                        else
                          setSelectedRows(
                            new Set(processedRows.map((_, i) => i)),
                          );
                      }}
                      className="text-[10px] font-[900] uppercase tracking-widest text-violet-400 hover:text-white transition-colors"
                    >
                      {selectedRows.size === processedRows.length
                        ? "Odznačiť všetko"
                        : "Označiť všetko"}
                    </button>
                  </div>
                  <div className="bg-white/5 rounded-3xl p-6 shadow-2xl border border-white/5 overflow-hidden">
                    <div className="overflow-x-auto max-h-[400px]">
                      <table className="w-full text-left">
                        <thead className="sticky top-0 bg-[#0d0d0f] backdrop-blur-md z-10 border-b border-white/5">
                          <tr>
                            <th className="pb-3 w-10"></th>
                            {headers.slice(0, 4).map((h) => (
                              <th
                                key={h}
                                className="pb-3 text-[10px] font-[900] text-white/30 uppercase tracking-widest"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {(showAllRows ? processedRows : processedRows.slice(0, 50)).map((row, i) => (
                            <tr
                              key={i}
                              className={`group hover:bg-white/5 transition-colors cursor-pointer ${selectedRows.has(i) ? "bg-violet-500/10" : ""}`}
                              onClick={() => {
                                const newSet = new Set(selectedRows);
                                if (newSet.has(i)) newSet.delete(i);
                                else newSet.add(i);
                                setSelectedRows(newSet);
                              }}
                            >
                              <td className="py-2.5 pr-2">
                                <div
                                  className={`w-4 h-4 rounded-md border transition-all flex items-center justify-center ${selectedRows.has(i) ? "bg-violet-600 border-violet-600 shadow-[0_0_10px_rgba(139,92,246,0.3)]" : "border-white/10 group-hover:border-violet-500"}`}
                                >
                                  {selectedRows.has(i) && (
                                    <Check className="w-3 h-3 text-white" />
                                  )}
                                </div>
                              </td>
                              {headers.slice(0, 4).map((h) => (
                                <td
                                  key={h}
                                  className="py-2.5 text-[11px] text-white/70 font-medium truncate max-w-[120px]"
                                >
                                  {row[h]}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {processedRows.length > 50 && !showAllRows && (
                      <button 
                        onClick={() => setShowAllRows(true)}
                        className="w-full mt-4 py-3 text-[10px] text-center font-[900] text-white/40 hover:text-white uppercase tracking-[0.2em] italic border-t border-white/5 transition-colors"
                      >
                        + {processedRows.length - 50} ďalších riadkov...
                      </button>
                    )}
                    <div className="mt-4 pt-4 border-t border-white/5 text-center">
                      <p className="text-[10px] font-[900] text-violet-400/40 uppercase tracking-widest flex items-center justify-center gap-2">
                        {file?.name} • {(file?.size || 0 / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === "confirm" && (
            <div className="p-10 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-8 shadow-lg shadow-green-900/20 border border-white/10">
                <Check className="w-8 h-8" />
              </div>
              <h4 className="text-3xl font-[900] text-white mb-3 tracking-tighter uppercase italic leading-none">
                Súbor overený
              </h4>
              
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-violet-600/10 border border-violet-500/30 rounded-2xl mb-10 shadow-[0_0_20px_rgba(139,92,246,0.1)]">
                <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                <p className="text-[11px] font-[900] text-violet-300 uppercase tracking-[0.2em] leading-none">
                  Identifikovaných <span className="text-white text-sm ml-1">{previewRows.length}</span> záznamov
                </p>
              </div>

              <div className="max-w-sm mx-auto grid grid-cols-1 gap-3">
                {(showAllPreview ? previewRows : previewRows.slice(0, 3)).map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/10 shadow-sm"
                  >
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-xs font-[900] text-white shadow-lg shadow-violet-900/20">
                      {(c.first_name?.[0] || "?") + (c.last_name?.[0] || "")}
                    </div>
                    <div className="text-left overflow-hidden">
                      <p className="text-[14px] font-[900] text-white truncate uppercase tracking-tight italic leading-none mb-1.5">
                        {c.first_name} {c.last_name}
                      </p>
                      <p className="text-[10px] text-white/40 truncate tracking-widest uppercase font-[900]">
                        {c.email || c.phone || "Bez kontaktu"}
                      </p>
                    </div>
                  </div>
                ))}
                {previewRows.length > 3 && !showAllPreview && (
                  <button 
                    onClick={() => setShowAllPreview(true)}
                    className="py-3 text-[10px] font-[900] text-white/20 hover:text-white uppercase tracking-[0.3em] transition-colors"
                  >
                    + ďalších {previewRows.length - 3} kontaktov...
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-10 border-t border-white/5 bg-black/40 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-8 py-4 text-[11px] font-[900] uppercase tracking-widest text-white/40 hover:text-white transition-all rounded-2xl hover:bg-white/5"
          >
            Zrušiť
          </button>
          {step !== "upload" && (
            <button
              onClick={handleImport}
              disabled={isUploading}
              className="px-10 py-4 bg-white text-black hover:bg-white/90 rounded-2xl text-[11px] font-[900] uppercase tracking-widest shadow-2xl transition-all flex items-center gap-3 active:scale-95 disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Spracúvam...
                </>
              ) : (
                <>
                  Potvrdiť import <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
