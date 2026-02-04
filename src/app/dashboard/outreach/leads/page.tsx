"use client";

import React, { useState, useEffect, useRef } from "react";
import { Zap, Upload, Trash2, Search, Loader2, Link2, MapPin, Briefcase, ChevronLeft, ChevronRight, Plus, Folder, LayoutGrid, CheckSquare, X, ArrowRightLeft } from "lucide-react";
import { 
    getColdLeads, 
    deleteColdLead, 
    updateColdLead, 
    getColdLeadLists, 
    createColdLeadList, 
    bulkDeleteColdLeads, 
    bulkUpdateColdLeads,
    type ColdLeadItem, 
    type ColdLeadList 
} from "@/app/actions/cold-leads";
import { ColdLeadsImportModal } from "@/components/dashboard/ColdLeadsImportModal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function OutreachLeadsPage() {
  // Data State
  const [leads, setLeads] = useState<ColdLeadItem[]>([]);
  const [lists, setLists] = useState<ColdLeadList[]>([]);
  const [activeListName, setActiveListName] = useState<string>("Zoznam 1");
  const [loading, setLoading] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());

  // Editing state
  const [editingCell, setEditingCell] = useState<{ id: string | number, field: keyof ColdLeadItem } | null>(null);
  const [editValue, setEditValue] = useState("");
  const editInputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const initData = async () => {
      setLoading(true);
      
      // Fetch Lists
      const listsRes = await getColdLeadLists();
      if (listsRes.success && listsRes.data) {
          setLists(listsRes.data);
          // If active list not in fetched lists (and lists not empty), default to first
          if (listsRes.data.length > 0 && !listsRes.data.find(l => l.name === activeListName)) {
              if (activeListName === "Zoznam 1") {
                   // Keep it, maybe not created yet? But we created it.
              } else {
                   setActiveListName(listsRes.data[0].name);
              }
          }
      }

      await refreshLeads(activeListName);
      setLoading(false);
  };

  const refreshLeads = async (listName: string) => {
    setLoading(true);
    const res = await getColdLeads(listName);
    if (res.success && res.data) {
      setLeads(res.data);
      setSelectedIds(new Set()); // Clear selection on list change
      setCurrentPage(1);
    }
    setLoading(false);
  };

  useEffect(() => {
    initData();
  }, []);

  useEffect(() => {
     refreshLeads(activeListName);
  }, [activeListName]);

  useEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingCell]);
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleCreateList = async () => {
      const name = prompt("Zadajte názov nového zoznamu:");
      if (!name) return;
      
      const res = await createColdLeadList(name);
      if (res.success) {
          toast.success("Zoznam vytvorený");
          // Refresh lists
          const listsRes = await getColdLeadLists();
          if (listsRes.success && listsRes.data) {
              setLists(listsRes.data);
              setActiveListName(name);
          }
      } else {
          toast.error("Chyba pri vytváraní zoznamu");
      }
  };

  // --- Bulk Actions ---

  const toggleSelectAll = () => {
      if (selectedIds.size === filteredLeads.length && filteredLeads.length > 0) {
          setSelectedIds(new Set());
      } else {
          // Select all matched by search
          setSelectedIds(new Set(filteredLeads.map(l => l.id)));
      }
  };

  const toggleSelectOne = (id: string | number) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) {
          newSet.delete(id);
      } else {
          newSet.add(id);
      }
      setSelectedIds(newSet);
  };

  const handleBulkDelete = async () => {
      if (!window.confirm(`Naozaj vymazať ${selectedIds.size} leadov?`)) return;
      
      const ids = Array.from(selectedIds);
      const res = await bulkDeleteColdLeads(ids);
      
      if (res.success) {
          toast.success(`${ids.length} leadov vymazaných`);
          refreshLeads(activeListName);
          setSelectedIds(new Set());
      } else {
          toast.error("Chyba pri hromadnom vymazaní");
      }
  };

  const handleBulkMove = async (targetListName: string) => {
      if (!confirm(`Presunúť ${selectedIds.size} leadov do ${targetListName}?`)) return;
      
      const ids = Array.from(selectedIds);
      const res = await bulkUpdateColdLeads(ids, { list_name: targetListName });
      
      if (res.success) {
          toast.success("Leady presunuté");
          refreshLeads(activeListName); // They should disappear from current list
          setSelectedIds(new Set());
      } else {
          toast.error("Chyba pri presune");
      }
  };


  // --- Individual Actions ---
  const handleDelete = async (id: string | number) => {
    if (!window.confirm("Naozaj chcete vymazať tento lead?")) return;
    const res = await deleteColdLead(id);
    if (res.success) {
      toast.success("Lead vymazaný");
      refreshLeads(activeListName);
    }
  };
  
  // --- Inline Edit Logic ---
  const startEditing = (lead: ColdLeadItem, field: keyof ColdLeadItem, currentValue: string) => {
    setEditingCell({ id: lead.id, field });
    setEditValue(currentValue || "");
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue("");
  };

  const saveEdit = async () => {
    if (!editingCell) return;

    const { id, field } = editingCell;
    const originalLead = leads.find(l => l.id === id);
    
    // Check if value actually changed
    if (originalLead && originalLead[field] === editValue) {
      cancelEdit();
      return;
    }

    // Logic for smart sentence update
    const updatedFields: Partial<ColdLeadItem> = { [field]: editValue };
    
    if (field === "company_name_reworked" && originalLead) {
        const oldName = originalLead.company_name_reworked || originalLead.title;
        const newName = editValue;
        const currentSentence = originalLead.ai_first_sentence || "";
        
        if (currentSentence.includes(oldName)) {
            const newSentence = currentSentence.replace(oldName, newName);
            updatedFields.ai_first_sentence = newSentence;
        } else if (!currentSentence) {
            updatedFields.ai_first_sentence = `Dobrý deň. Páči sa mi, že v ${newName} sa venujete poskytovaniu kvalitných služieb a produktov pre Vašich zákazníkov.`;
        }
    }

    // Optimistic update
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updatedFields } : l));

    const res = await updateColdLead(id, updatedFields);
    
    if (res.success) {
      toast.success("Uložené");
    } else {
      toast.error("Chyba pri ukladaní");
      refreshLeads(activeListName);
    }
    cancelEdit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      saveEdit();
    } else if (e.key === "Escape") {
      cancelEdit();
    }
  };

  const filteredLeads = leads.filter(l => 
    l.company_name_reworked?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination Logic
  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  const paginatedLeads = filteredLeads.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
  );

  const goToPage = (page: number) => {
      if (page >= 1 && page <= totalPages) {
          setCurrentPage(page);
          window.scrollTo({ top: 0, behavior: "smooth" });
      }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50/30">
        
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col pt-8 pb-4 px-4 shadow-sm z-10 shrink-0">
         <div className="flex items-center gap-3 px-2 mb-8">
             <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
                <Zap className="w-5 h-5 text-white fill-white/20" />
             </div>
             <div>
                <h1 className="font-black text-gray-900 text-sm uppercase tracking-wide">Cold Outreach</h1>
                <p className="text-[10px] text-gray-400 font-bold">Kampane & Zoznamy</p>
             </div>
         </div>

         <div className="flex-1 overflow-y-auto space-y-1 pr-2 scrollbar-thin scrollbar-thumb-gray-200">
             <div className="px-2 py-2">
                 <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 pl-2">Moje Zoznamy</p>
                 {lists.map(list => (
                     <button
                        key={list.id}
                        onClick={() => setActiveListName(list.name)}
                        className={cn(
                            "w-full text-left px-4 py-3 rounded-[1rem] flex items-center gap-3 transition-all text-xs font-bold",
                            activeListName === list.name 
                              ? "bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100" 
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        )}
                     >
                        <Folder className={cn("w-4 h-4", activeListName === list.name ? "fill-blue-200" : "")} />
                        {list.name}
                     </button>
                 ))}
             </div>
         </div>

         <div className="mt-4 pt-4 border-t border-gray-100 px-2">
             <button 
                onClick={handleCreateList}
                className="w-full py-3 border-2 border-dashed border-gray-200 rounded-[1rem] flex items-center justify-center gap-2 text-gray-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/50 transition-all font-bold text-xs uppercase tracking-wide"
             >
                 <Plus className="w-4 h-4" />
                 Nový Zoznam
             </button>
         </div>
      </aside>


      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto w-full relative">
        <div className="p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen pb-32">
            
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h2 className="text-3xl font-black tracking-tight text-gray-900 flex items-center gap-3">
                    {activeListName}
                    <span className="text-sm font-bold bg-gray-100 text-gray-500 px-3 py-1 rounded-full">{filteredLeads.length}</span>
                  </h2>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsImportModalOpen(true)}
                    className="bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-[1.2rem] font-bold uppercase tracking-wide text-[11px] flex items-center gap-2 transition-all shadow-lg shadow-gray-200 active:scale-95"
                  >
                    <Upload className="w-4 h-4" />
                    Import Leady
                  </button>
                </div>
            </div>

            {/* Bulk Actions Bar (Floating) */}
            {selectedIds.size > 0 && (
                <div className="sticky top-0 z-20 bg-white border border-blue-100 shadow-xl shadow-blue-50 rounded-[1.5rem] p-2 flex items-center gap-4 animate-in slide-in-from-top-4 duration-300 mx-auto max-w-2xl justify-between">
                     <div className="flex items-center gap-4 px-4">
                         <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-black text-xs shrink-0">
                             {selectedIds.size}
                         </div>
                         <span className="text-xs font-bold text-gray-600 uppercase tracking-wide max-md:hidden">Vybraných položiek</span>
                     </div>
                     <div className="flex gap-2">
                         <div className="h-8 w-px bg-gray-100 mx-1"></div>
                         
                         {/* Move Dropdown (Simplified as primitive select for now or custom logic) */}
                         <div className="relative group">
                            <button className="px-4 py-2 hover:bg-gray-50 rounded-xl flex items-center gap-2 text-gray-700 font-bold text-xs transition-colors">
                                <ArrowRightLeft className="w-4 h-4 text-blue-500" />
                                Presunúť
                            </button>
                            <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-100 shadow-xl rounded-xl overflow-hidden hidden group-hover:block animate-in fade-in zoom-in-95 duration-200">
                                {lists.filter(l => l.name !== activeListName).map(l => (
                                    <button 
                                        key={l.id} 
                                        onClick={() => handleBulkMove(l.name)}
                                        className="w-full text-left px-4 py-3 hover:bg-blue-50 text-xs font-bold text-gray-600 hover:text-blue-700 transition-colors"
                                    >
                                        {l.name}
                                    </button>
                                ))}
                            </div>
                         </div>

                         <button 
                            onClick={handleBulkDelete}
                            className="px-4 py-2 hover:bg-red-50 text-red-600 rounded-xl flex items-center gap-2 font-bold text-xs transition-colors"
                         >
                             <Trash2 className="w-4 h-4" />
                             Vymazať
                         </button>
                         
                         <div className="h-8 w-px bg-gray-100 mx-1"></div>

                         <button 
                             onClick={() => setSelectedIds(new Set())}
                             className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
                         >
                             <X className="w-4 h-4" />
                         </button>
                     </div>
                </div>
            )}

            {/* Table Container */}
            <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-visible shadow-xl shadow-gray-100/50">
                {/* Filters Row */}
                <div className="p-6 border-b border-gray-100 flex gap-4 items-center justify-between">
                     <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Hľadať v zozname..."
                          className="w-full pl-12 pr-6 py-3 bg-gray-50 border-transparent focus:bg-white border-2 focus:border-blue-100 rounded-[1.2rem] text-sm outline-none transition-all font-bold placeholder:text-gray-400"
                          value={searchTerm}
                          onChange={handleSearchChange}
                        />
                     </div>
                     <div className="hidden md:flex flex-col items-end">
                         <span className="text-[9px] font-black tracking-widest text-gray-300 uppercase">Strana</span>
                         <span className="text-xs font-bold text-gray-900">{currentPage} / {totalPages || 1}</span>
                     </div>
                </div>

                <div className="overflow-x-auto min-h-[500px]">
                  <table className="w-full text-left">
                    <thead className="sticky top-0 bg-white z-10 shadow-sm">
                      <tr className="border-b border-gray-100">
                        <th className="pl-6 pr-4 py-5 w-10">
                            <button 
                                onClick={toggleSelectAll}
                                className={cn(
                                    "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all",
                                    selectedIds.size > 0 && selectedIds.size === filteredLeads.length 
                                        ? "bg-blue-600 border-blue-600 text-white" 
                                        : "border-gray-200 text-transparent hover:border-blue-400"
                                )}
                            >
                                <CheckSquare className="w-3 h-3 fill-current" />
                            </button>
                        </th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Firma & Detail</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Personalizácia</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {loading ? (
                        <tr>
                            <td colSpan={4} className="py-32 text-center">
                                <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600/20" />
                            </td>
                        </tr>
                      ) : filteredLeads.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-8 py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">
                             Tento zoznam je prázdny.
                             <br/>
                             <span className="text-gray-300 text-[10px] mt-2 block">Importujte leady alebo ich sem presuňte.</span>
                          </td>
                        </tr>
                      ) : (
                        paginatedLeads.map((lead) => (
                          <tr 
                            key={lead.id} 
                            className={cn(
                                "group transition-colors",
                                selectedIds.has(lead.id) ? "bg-blue-50/40" : "hover:bg-gray-50/50"
                            )}
                          >
                            <td className="pl-6 pr-4 py-5 align-top pt-8">
                                <button 
                                    onClick={() => toggleSelectOne(lead.id)}
                                    className={cn(
                                        "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all",
                                        selectedIds.has(lead.id) 
                                            ? "bg-blue-600 border-blue-600 text-white" 
                                            : "border-gray-200 text-transparent hover:border-blue-300 text-gray-100"
                                    )}
                                >
                                    <CheckSquare className="w-3 h-3 fill-current" />
                                </button>
                            </td>
                            <td className="px-6 py-6 align-top">
                               <div 
                                  className="cursor-pointer mb-2"
                                  onDoubleClick={() => startEditing(lead, "company_name_reworked", lead.company_name_reworked || lead.title)}
                                >
                                  {editingCell?.id === lead.id && editingCell?.field === "company_name_reworked" ? (
                                    <input
                                      ref={editInputRef as React.RefObject<HTMLInputElement>}
                                      className="w-full p-2 border border-blue-500 rounded-lg bg-white text-base font-black text-gray-900 shadow-lg ring-4 ring-blue-50 z-20 relative"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={saveEdit}
                                      onKeyDown={handleKeyDown}
                                    />
                                  ) : (
                                      <div className="font-black text-gray-900 text-base flex items-center gap-2">
                                        {lead.company_name_reworked || lead.title}
                                      </div>
                                  )}
                               </div>

                               <div className="flex flex-wrap gap-2 text-xs">
                                    {lead.website && (
                                        <a href={lead.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-500 bg-blue-50 px-2 py-1 rounded-md font-bold uppercase tracking-wider text-[10px] hover:bg-blue-100 transition-colors">
                                            <Link2 className="w-3 h-3" />
                                            {lead.website.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}
                                        </a>
                                    )}
                                    <div className="flex items-center gap-1 text-gray-500 bg-gray-100 px-2 py-1 rounded-md font-bold text-[10px] uppercase tracking-wider">
                                        <MapPin className="w-3 h-3" /> {lead.city || "Slovensko"}
                                    </div>
                                    <div className="flex items-center gap-1 text-gray-500 bg-gray-100 px-2 py-1 rounded-md font-bold text-[10px] uppercase tracking-wider">
                                        <Briefcase className="w-3 h-3" /> {lead.category?.slice(0, 20) || "Firma"}
                                    </div>
                               </div>
                            </td>

                            <td className="px-6 py-6 max-w-lg align-top">
                                <div 
                                    className="cursor-pointer"
                                    onDoubleClick={() => startEditing(lead, "ai_first_sentence", lead.ai_first_sentence || "")}
                                >
                                    {editingCell?.id === lead.id && editingCell?.field === "ai_first_sentence" ? (
                                        <textarea
                                            ref={editInputRef as React.RefObject<HTMLTextAreaElement>}
                                            className="w-full p-4 border border-blue-500 rounded-2xl bg-white text-sm font-medium text-gray-700 h-28 shadow-xl ring-4 ring-blue-50 z-20 relative focus:outline-none"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            onBlur={saveEdit}
                                            onKeyDown={handleKeyDown}
                                        />
                                    ) : (
                                        <div className="bg-gray-50 hover:bg-white hover:shadow-lg hover:shadow-gray-100 p-5 rounded-2xl border border-dashed border-gray-200 hover:border-blue-200 transition-all group/cell">
                                            <p className="text-[12px] font-medium leading-relaxed text-gray-600 italic">
                                                &quot;{lead.ai_first_sentence}&quot;
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </td>
                            <td className="px-6 py-6 text-right align-middle">
                              <button 
                                onClick={() => handleDelete(lead.id)}
                                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="p-6 flex items-center justify-between border-t border-gray-100 bg-gray-50/50 rounded-b-[2.5rem]">
                        <button
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-100 rounded-xl font-bold text-xs uppercase tracking-wider text-gray-600 hover:border-blue-400 hover:text-blue-600 disabled:opacity-50 transition-all shadow-sm"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Späť
                        </button>

                        <div className="hidden md:flex gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum = i + 1;
                                if (totalPages > 5 && currentPage > 3) {
                                     pageNum = Math.min(currentPage - 2 + i, totalPages)
                                     if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i
                                }
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => goToPage(pageNum)}
                                        className={cn(
                                            "w-9 h-9 rounded-lg font-black text-xs flex items-center justify-center transition-all",
                                            currentPage === pageNum 
                                            ? "bg-blue-600 text-white shadow-md shadow-blue-200" 
                                            : "bg-white text-gray-400 hover:bg-gray-100"
                                        )}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-100 rounded-xl font-bold text-xs uppercase tracking-wider text-gray-600 hover:border-blue-400 hover:text-blue-600 disabled:opacity-50 transition-all shadow-sm"
                        >
                            Ďalej
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>

      </main>

      <ColdLeadsImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        onSuccess={() => refreshLeads(activeListName)} 
        initialListName={activeListName}
      />
    </div>
  );
}
