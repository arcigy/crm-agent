"use client";

import { useState, useRef, useEffect } from "react";
import {
  Upload,
  X,
  Check,
  ArrowRight,
  Loader2,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { bulkCreateColdLeads, enrichColdLead, ColdLeadItem } from "@/app/actions/cold-leads";

interface ColdLeadsImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialListName?: string;
}

type Step = "upload" | "map" | "enrich" | "confirm";

export function ColdLeadsImportModal({
  isOpen,
  onClose,
  onSuccess,
  initialListName,
}: ColdLeadsImportModalProps) {
  const [step, setStep] = useState<Step>("upload");
  const [isUploading, setIsUploading] = useState(false);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({
    title: "",
    website: "",
    phone: "",
    city: "",
    category: "",
    google_maps_url: ""
  });
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [processedRows, setProcessedRows] = useState<Record<string, any>[]>([]);
  
  // Enrichment State
  const [enrichmentProgress, setEnrichmentProgress] = useState({ current: 0, total: 0 });
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (logsEndRef.current) {
        logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

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
            if (low.includes("title") || low.includes("názov") || low.includes("original_title") || low.includes("name")) newMapping.title = h;
            if (low.includes("website") || low.includes("web") || low.includes("site") || low.includes("domain") || (low === "url") || (low === "link")) newMapping.website = h;
            if (low.includes("phone") || low.includes("tel") || low.includes("mobil")) newMapping.phone = h;
            if (low.includes("city") || low.includes("mesto") || low.includes("address") || low.includes("adresa")) newMapping.city = h;
            if (low.includes("category") || low.includes("kategória") || low.includes("industry") || low.includes("odvetvie")) newMapping.category = h;
            if (low.includes("maps") || (low.includes("google") && low.includes("url")) || low.includes("gmap")) newMapping.google_maps_url = h;
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
          website: String(row[mapping.website] || ""),
          phone: String(row[mapping.phone] || ""),
          city: String(row[mapping.city] || ""),
          category: String(row[mapping.category] || ""),
          list_name: initialListName || "Zoznam 1",
          google_maps_url: String(row[mapping.google_maps_url] || "")
        };
      });

      const res = await bulkCreateColdLeads(leadsToUpload);

      if (res.success && res.items) {
        if (res.duplicates && res.duplicates > 0) {
            toast.warning(`Preskočených ${res.duplicates} duplikátov (web/tel/meno).`);
        }
        toast.success(`Úspešne importovaných ${res.count} unikátnych leadov.`);
        setStep("enrich");
        startEnrichment(res.items);
      } else if (res.success) {
         if (res.duplicates && res.duplicates > 0) {
            toast.warning(`Ignorovaných ${res.duplicates} duplikátov.`);
         }
         toast.success("Import hotový, ale nedá sa spustiť AI enrich (chýbajú ID).");
         onSuccess();
         onClose();
      } else {
        toast.error("Import zlyhal: " + res.error);
        setIsUploading(false);
      }
    } catch (e: any) {
      toast.error("Chyba: " + e.message);
      setIsUploading(false);
    }
  };

  const startEnrichment = async (items: ColdLeadItem[]) => {
      setEnrichmentProgress({ current: 0, total: items.length });
      setLogs([]);
      let completed = 0;
      
      for (const item of items) {
          try {
             setLogs(prev => [...prev, `Spúšťam: ${item.title}...`]);
             
             // Cast to any for now to access the custom debug property from the action
             const res = await enrichColdLead(item.id) as { success: boolean, debug?: any, error?: string };
             
             if (res.success && res.debug) {
                 const d = res.debug;
                 setLogs(prev => [...prev, `✅ OK: ${d.name}`]);
                 if (d.scraped) setLogs(prev => [...prev, `   - Web: načítaný (${d.scrapedLength} znakov)`]);
                 else setLogs(prev => [...prev, `   - Web: nenačítaný/ignorovaný`]);
                 
                 if (d.emailFound) setLogs(prev => [...prev, `   - Email: NAJDENÝ! (${d.emailFound})`]);
                 
                 if (d.aiGenerated) setLogs(prev => [...prev, `   - AI: Vygenerované 2 vety`]);
                 else setLogs(prev => [...prev, `   - AI: Nevygenerované`]);

             } else {
                 setLogs(prev => [...prev, `❌ CHYBA: ${res.error || "Neznáma chyba"}`]);
             }

          } catch (e: unknown) {
              const errorMessage = e instanceof Error ? e.message : String(e);
              setLogs(prev => [...prev, `❌ CRITICAL FAIL: ${errorMessage}`]);
              console.error(`Failed to enrich ${item.id}`, e);
          }
          completed++;
          setEnrichmentProgress({ current: completed, total: items.length });
      }
      
      setLogs(prev => [...prev, "🏁 HOTOVO! Všetky riadky spracované."]);
      toast.success("AI Personalizácia hotová!");
      // Don't close immediately so user can read logs
      setTimeout(() => {
          onSuccess();
          onClose();
      }, 5000);
  };

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0" onClick={isUploading ? undefined : onClose}></div>
      <div className={`bg-white w-full ${step === "map" ? "max-w-4xl" : "max-w-xl"} rounded-[3rem] shadow-2xl overflow-hidden flex flex-col relative transform transition-all animate-in zoom-in-95 duration-500 border border-gray-100`}>
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h3 className="font-black text-xl text-gray-900 tracking-tight">
              {step === "upload" ? "Import Cold Leads" : step === "map" ? "Priradenie stĺpcov" : "AI Personalizácia"}
            </h3>
            <div className="flex gap-2 mt-1">
              <div className={`h-1 w-8 rounded-full ${step === "upload" ? "bg-blue-600" : "bg-green-500"}`} />
              <div className={`h-1 w-8 rounded-full ${step === "map" ? "bg-blue-600" : step === "enrich" ? "bg-green-500" : "bg-gray-200"}`} />
              <div className={`h-1 w-8 rounded-full ${step === "enrich" ? "bg-blue-600" : "bg-gray-200"}`} />
            </div>
          </div>
          {!isUploading && (
            <button onClick={onClose} className="p-2 hover:bg-white rounded-xl shadow-sm border border-gray-100 transition-colors">
                <X className="w-5 h-5 text-gray-400" />
            </button>
          )}
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
                  <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-[0.3em] text-gray-400">Náhľad dát ({processedRows.length} riadkov)</h4>
                      <div className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">Vybrané: {selectedRows.size}</div>
                  </div>

                  {/* Range Selector */}
                  <div className="bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 flex items-center gap-4">
                      <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase text-gray-400">Od:</span>
                          <input 
                            type="number" 
                            min={1} 
                            max={processedRows.length}
                            className="w-20 h-8 text-center text-xs font-bold bg-white border border-gray-200 rounded-lg outline-none focus:border-blue-500"
                            placeholder="1"
                            id="range-start"
                            defaultValue={1}
                          />
                      </div>
                      <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase text-gray-400">Do:</span>
                          <input 
                            type="number" 
                            min={1} 
                            max={processedRows.length}
                            className="w-20 h-8 text-center text-xs font-bold bg-white border border-gray-200 rounded-lg outline-none focus:border-blue-500"
                            placeholder={String(processedRows.length)}
                            id="range-end"
                            defaultValue={processedRows.length}
                          />
                      </div>
                      <button 
                        onClick={() => {
                            const startInput = document.getElementById("range-start") as HTMLInputElement;
                            const endInput = document.getElementById("range-end") as HTMLInputElement;
                            const start = parseInt(startInput.value) || 1;
                            const end = parseInt(endInput.value) || processedRows.length;
                            
                            const newSet = new Set<number>();
                            processedRows.forEach((_, i) => {
                                if (i + 1 >= start && i + 1 <= end) {
                                    newSet.add(i);
                                }
                            });
                            setSelectedRows(newSet);
                            toast.success(`Vybraný rozsah ${start} - ${end} (${newSet.size} riadkov)`);
                        }}
                        className="ml-auto px-4 py-2 bg-white border border-gray-200 shadow-sm rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 active:scale-95 transition-all"
                      >
                        Vybrať
                      </button>
                  </div>

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


          {step === "enrich" && (
              <div className="p-8 flex flex-col items-center justify-center min-h-[300px] text-center space-y-6">
                  {/* Status Visuals */}
                  <div className="relative">
                      <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 rounded-full animate-pulse"></div>
                      <div className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-[2.5rem] flex items-center justify-center shadow-xl relative z-10">
                          <Sparkles className="w-10 h-10 text-white animate-spin-slow" />
                      </div>
                  </div>
                  
                  <div>
                      <h3 className="text-2xl font-black text-gray-900 mb-2">Generujem AI Oslovia</h3>
                      <p className="text-gray-500 font-medium">Analyzujem webstránky a píšem personalizované vety <br/> pomocou <span className="text-blue-600 font-bold">Gemini 2.0 Flash</span>...</p>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full max-w-md space-y-2">
                       <div className="bg-gray-100 rounded-full h-4 overflow-hidden relative">
                          <div 
                            className="bg-blue-600 h-full transition-all duration-300 ease-out"
                            style={{ width: `${(enrichmentProgress.current / enrichmentProgress.total) * 100}%` }}
                          ></div>
                       </div>
                       <p className="text-xs font-black uppercase tracking-widest text-gray-400">
                         {enrichmentProgress.current} / {enrichmentProgress.total} hotovo
                       </p>
                  </div>

                  {/* CONSOLE OUTPUT */}
                  <div className="w-full max-w-2xl mt-8 bg-gray-900 rounded-2xl p-4 text-left overflow-hidden border border-white/10 shadow-inner">
                      <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Live Console</span>
                          <span className="text-[10px] font-mono text-gray-600">v0.1.0</span>
                      </div>
                      <div className="h-40 overflow-y-auto space-y-1 font-mono text-[10px] text-gray-300 overscroll-contain">
                          {logs.length === 0 && <span className="text-gray-600 italic">Čakám na spustenie...</span>}
                          {logs.map((log, i) => (
                              <div key={i} className="whitespace-pre-wrap border-b border-white/5 pb-1">
                                  <span className="text-blue-500">[{new Date().toLocaleTimeString()}]</span> {log}
                              </div>
                          ))}
                          <div ref={logsEndRef} />
                      </div>
                  </div>
              </div>
          )}
        </div>

        {step !== "enrich" && ( 
            <div className="p-8 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-4">
            <button onClick={onClose} disabled={isUploading} className="px-6 py-3 text-xs font-black uppercase tracking-widest text-gray-400 disabled:opacity-50">Zrušiť</button>
            {step !== "upload" && (
                <button onClick={handleImport} disabled={isUploading} className="px-10 py-4 bg-gray-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl flex items-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed">
                {isUploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Spracúvam</> : <>Importovať <ArrowRight className="w-4 h-4" /></>}
                </button>
            )}
            </div>
        )}
      </div>
    </div>
  );
}
