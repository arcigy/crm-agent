"use client";

import { useState, useRef } from "react";
import {
  Upload,
  X,
  Check,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { bulkCreateColdLeads } from "@/app/actions/cold-leads";

interface ColdLeadsImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = "upload" | "map" | "confirm";

export function ColdLeadsImportModal({
  isOpen,
  onClose,
  onSuccess,
}: ColdLeadsImportModalProps) {
  const [step, setStep] = useState<Step>("upload");
  const [isUploading, setIsUploading] = useState(false);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({
    title: "",
    company_name_reworked: "",
    website: "",
    phone: "",
    city: "",
    category: "",
    abstract: "",
    ai_first_sentence: "",
  });
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [processedRows, setProcessedRows] = useState<Record<string, any>[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const processFile = async (selectedFile: File) => {
    const name = selectedFile.name.toLowerCase();
    if (name.endsWith(".csv")) {
      const text = await selectedFile.text();
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setHeaders(results.meta.fields || []);
          setStep("map");
          
          const newMapping = { ...mapping };
          (results.meta.fields || []).forEach((h) => {
            const low = h.toLowerCase();
            if (low.includes("title") || low.includes("názov")) newMapping.title = h;
            if (low.includes("reworked") || low.includes("meno")) newMapping.company_name_reworked = h;
            if (low.includes("website") || low.includes("web")) newMapping.website = h;
            if (low.includes("phone") || low.includes("tel")) newMapping.phone = h;
            if (low.includes("city") || low.includes("mesto")) newMapping.city = h;
            if (low.includes("category") || low.includes("kategória") || low.includes("industry")) newMapping.category = h;
            if (low.includes("abstract") || low.includes("abstrakt")) newMapping.abstract = h;
            if (low.includes("sentence") || low.includes("icebreaker") || low.includes("veta")) newMapping.ai_first_sentence = h;
          });
          setMapping(newMapping);
          setSelectedRows(new Set(results.data.map((_, i) => i)));
          setProcessedRows(results.data as Record<string, any>[]);
        },
      });
    } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      const buffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(buffer);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(sheet) as Record<string, any>[];
      if (data.length > 0) {
        const sheetHeaders = Object.keys(data[0]);
        setHeaders(sheetHeaders);
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
      const leadsToUpload = Array.from(selectedRows).map((index) => {
        const row = processedRows[index];
        return {
          title: String(row[mapping.title] || ""),
          company_name_reworked: String(row[mapping.company_name_reworked] || ""),
          website: String(row[mapping.website] || ""),
          phone: String(row[mapping.phone] || ""),
          city: String(row[mapping.city] || ""),
          category: String(row[mapping.category] || ""),
          abstract: String(row[mapping.abstract] || ""),
          ai_first_sentence: String(row[mapping.ai_first_sentence] || ""),
        };
      });

      const res = await bulkCreateColdLeads(leadsToUpload);

      if (res.success) {
        toast.success(`Importovaných ${res.count} leadov.`);
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
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0" onClick={onClose}></div>
      <div className={`bg-white w-full ${step === "map" ? "max-w-4xl" : "max-w-xl"} rounded-[3rem] shadow-2xl overflow-hidden flex flex-col relative transform transition-all animate-in zoom-in-95 duration-500 border border-gray-100`}>
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h3 className="font-black text-xl text-gray-900 tracking-tight">
              {step === "upload" ? "Import Cold Leads" : step === "map" ? "Priradenie stĺpcov" : "Potvrdenie importu"}
            </h3>
            <div className="flex gap-2 mt-1">
              <div className={`h-1 w-8 rounded-full ${step === "upload" ? "bg-blue-600" : "bg-green-500"}`} />
              <div className={`h-1 w-8 rounded-full ${step === "map" ? "bg-blue-600" : step === "confirm" ? "bg-green-500" : "bg-gray-200"}`} />
              <div className={`h-1 w-8 rounded-full ${step === "confirm" ? "bg-blue-600" : "bg-gray-200"}`} />
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl shadow-sm border border-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto max-h-[70vh]">
          {step === "upload" && (
            <div className="p-8 space-y-8">
              <div onClick={() => fileInputRef.current?.click()} className="border-4 border-dashed border-gray-100 rounded-[3rem] p-12 flex flex-col items-center text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all group">
                <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.xlsx,.xls" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} />
                <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center text-gray-300 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                  <Upload className="w-10 h-10" />
                </div>
                <p className="text-xl font-black text-gray-900 mb-2">Nahrajte CSV s výsledkami AI</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Podporujeme CSV a Excel</p>
              </div>
            </div>
          )}

          {step === "map" && (
            <div className="p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-6">
                  {Object.keys(mapping).map((field) => (
                    <div key={field} className="space-y-2">
                      <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1">
                        {field.replace(/_/g, " ")}
                      </label>
                      <select value={mapping[field]} onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })} className="w-full h-14 bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 font-bold text-sm focus:border-blue-500 focus:bg-white transition-all outline-none">
                        <option value="">-- Vynechať --</option>
                        {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
                <div className="space-y-6">
                  <h4 className="text-xs font-black uppercase tracking-[0.3em] text-gray-400">Náhľad dát ({selectedRows.size})</h4>
                  <div className="bg-gray-900 rounded-[2.5rem] p-6 shadow-2xl overflow-hidden border border-white/10">
                    <div className="overflow-x-auto max-h-[400px]">
                      <table className="w-full text-left">
                        <thead className="sticky top-0 bg-gray-900 z-10">
                          <tr>
                            <th className="pb-4 w-10"></th>
                            {headers.slice(0, 3).map((h) => <th key={h} className="pb-4 text-[9px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5">{h}</th>)}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {processedRows.slice(0, 10).map((row, i) => (
                            <tr key={i} className={`group hover:bg-white/5 transition-colors cursor-pointer ${selectedRows.has(i) ? "bg-blue-500/5" : ""}`} onClick={() => {
                              const newSet = new Set(selectedRows);
                              if (newSet.has(i)) newSet.delete(i);
                              else newSet.add(i);
                              setSelectedRows(newSet);
                            }}>
                              <td className="py-3 pr-2">
                                <div className={`w-4 h-4 rounded-md border-2 transition-all flex items-center justify-center ${selectedRows.has(i) ? "bg-blue-500 border-blue-500" : "border-white/10 group-hover:border-white/30"}`}>
                                  {selectedRows.has(i) && <Check className="w-3 h-3 text-white" />}
                                </div>
                              </td>
                              {headers.slice(0, 3).map((h) => <td key={h} className="py-3 text-[10px] text-gray-300 truncate max-w-[120px]">{String(row[h] || '')}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-8 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-4">
          <button onClick={onClose} className="px-6 py-3 text-xs font-black uppercase tracking-widest text-gray-400">Zrušiť</button>
          {step !== "upload" && (
            <button onClick={handleImport} disabled={isUploading} className="px-10 py-4 bg-gray-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl flex items-center gap-3">
              {isUploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Spracúvam</> : <>Importovať <ArrowRight className="w-4 h-4" /></>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
