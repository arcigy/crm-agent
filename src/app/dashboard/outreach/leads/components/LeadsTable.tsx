"use client";

import React from "react";
import { 
    Search, Edit3, Trash2, Send, CheckCircle, Clock, AlertCircle, 
    MoreHorizontal, Globe, Mail, Phone, MapPin, QrCode, Eye, Loader2
} from "lucide-react";
import { ColdLeadItem } from "@/app/actions/cold-leads";
import { cn } from "@/lib/utils";
import { QRCodeSVG } from "qrcode.react";

interface LeadsTableProps {
    leads: ColdLeadItem[];
    selectedIds: Set<string | number>;
    toggleSelectAll: () => void;
    toggleSelectOne: (id: string | number) => void;
    onEdit: (lead: ColdLeadItem, field: keyof ColdLeadItem, value: string) => void;
    onDelete: (id: string | number) => void;
    onSendEmail: (id: string | number) => void;
    onOpenDetail: (lead: ColdLeadItem) => void;
    editingCell: { id: string | number, field: keyof ColdLeadItem } | null;
    editValue: string;
    setEditValue: (val: string) => void;
    saveEdit: () => void;
    cancelEdit: () => void;
    handleKeyDown: (e: React.KeyboardEvent) => void;
    editInputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement>;
}

export function LeadsTable({
    leads,
    selectedIds,
    toggleSelectAll,
    toggleSelectOne,
    onEdit,
    onDelete,
    onSendEmail,
    onOpenDetail,
    editingCell,
    editValue,
    setEditValue,
    saveEdit,
    cancelEdit,
    handleKeyDown,
    editInputRef
}: LeadsTableProps) {
    return (
        <div className="bg-white border border-gray-100 rounded-[2rem] shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1200px]">
                    <thead>
                        <tr className="border-b border-gray-50 bg-gray-50/30">
                            <th className="p-4 w-12 text-center">
                                <input 
                                    type="checkbox" 
                                    checked={leads.length > 0 && selectedIds.size === leads.length}
                                    onChange={toggleSelectAll}
                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                            </th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Kontakt / Firma</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Web / Lokalita</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Kontakt</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-400">AI Personalizácia</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Akcie</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {leads.map((lead) => (
                            <tr key={lead.id} className={cn("group hover:bg-blue-50/30 transition-colors", selectedIds.has(lead.id) ? "bg-blue-50/50" : "")}>
                                <td className="p-4 text-center">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedIds.has(lead.id)}
                                        onChange={() => toggleSelectOne(lead.id)}
                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                </td>
                                <td className="p-4">
                                     <StatusBadge lead={lead} />
                                </td>
                                <td className="p-4">
                                    <div className="flex flex-col">
                                        <EditableCell 
                                            value={lead.company_name_reworked || lead.title} 
                                            field="company_name_reworked"
                                            lead={lead}
                                            editingCell={editingCell}
                                            editValue={editValue}
                                            setEditValue={setEditValue}
                                            onSave={saveEdit}
                                            onCancel={cancelEdit}
                                            onKeyDown={handleKeyDown}
                                            onClick={() => onEdit(lead, "company_name_reworked", lead.company_name_reworked || lead.title)}
                                            inputRef={editInputRef}
                                            className="font-black text-xs text-gray-900 uppercase tracking-tight"
                                        />
                                        <span className="text-[10px] font-bold text-gray-400 uppercase italic">{lead.title}</span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex flex-col gap-1">
                                        {lead.website ? (
                                            <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1.5 text-[11px] font-bold truncate max-w-[150px]">
                                                <Globe className="w-3 h-3" />
                                                {lead.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                                            </a>
                                        ) : (
                                            <span className="text-[10px] font-bold text-gray-300 italic uppercase">Bez webu</span>
                                        )}
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase">
                                            <MapPin className="w-3 h-3 text-red-400" />
                                            {lead.city || "Neznáme"}
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex flex-col gap-1">
                                        <EditableCell 
                                            value={lead.email || ""} 
                                            field="email"
                                            lead={lead}
                                            editingCell={editingCell}
                                            editValue={editValue}
                                            setEditValue={setEditValue}
                                            onSave={saveEdit}
                                            onCancel={cancelEdit}
                                            onKeyDown={handleKeyDown}
                                            onClick={() => onEdit(lead, "email", lead.email || "")}
                                            inputRef={editInputRef}
                                            placeholder="Chýba email"
                                            className="text-xs font-bold text-gray-600"
                                        />
                                        {lead.phone && <span className="text-[10px] font-bold text-gray-400">{lead.phone}</span>}
                                    </div>
                                </td>
                                <td className="p-4">
                                    <EditableCell 
                                        value={lead.ai_first_sentence || ""} 
                                        field="ai_first_sentence"
                                        lead={lead}
                                        editingCell={editingCell}
                                        editValue={editValue}
                                        setEditValue={setEditValue}
                                        onSave={saveEdit}
                                        onCancel={cancelEdit}
                                        onKeyDown={handleKeyDown}
                                        onClick={() => onEdit(lead, "ai_first_sentence", lead.ai_first_sentence || "")}
                                        inputRef={editInputRef}
                                        placeholder="Čaká na AI..."
                                        className="text-[10px] font-medium leading-relaxed text-gray-500 italic max-w-[300px] line-clamp-2"
                                    />
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex items-center justify-end gap-1 translate-x-2 opacity-0 group-hover:opacity-100 transition-all">
                                        <button onClick={() => onOpenDetail(lead)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Detail">
                                            <Eye className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => onSendEmail(lead.id)} className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all" title="Poslať email">
                                            <Mail className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => onDelete(lead.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Vymazať">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function StatusBadge({ lead }: { lead: ColdLeadItem }) {
    if (lead.enrichment_status === 'processing') return <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase"><Loader2 className="w-3 h-3 animate-spin"/> AI Pracuje</div>;
    if (lead.enrichment_status === 'pending') return <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-600 text-[10px] font-black uppercase"><Clock className="w-3 h-3"/> Vo Fronte</div>;
    if (lead.enrichment_status === 'completed') return <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase"><CheckCircle className="w-3 h-3"/> Hotovo</div>;
    if (lead.enrichment_status === 'failed') return <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-600 text-[10px] font-black uppercase"><AlertCircle className="w-3 h-3"/> Chyba</div>;
    return <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-50 text-gray-400 text-[10px] font-black uppercase">Nový</div>;
}

interface EditableCellProps {
    value: string;
    field: keyof ColdLeadItem;
    lead: ColdLeadItem;
    editingCell: { id: string | number, field: keyof ColdLeadItem } | null;
    editValue: string;
    setEditValue: (val: string) => void;
    onSave: () => void;
    onCancel: () => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
    onClick: () => void;
    inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement>;
    placeholder?: string;
    className?: string;
}

function EditableCell({
    value, field, lead, editingCell, editValue, setEditValue, onSave, onCancel, onKeyDown, onClick, inputRef, placeholder, className
}: EditableCellProps) {
    const isEditing = editingCell?.id === lead.id && editingCell?.field === field;

    if (isEditing) {
        return (
            <div className="relative group/edit">
                <textarea
                    ref={inputRef as any}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={onSave}
                    onKeyDown={onKeyDown}
                    className="w-full bg-white border-2 border-blue-500 rounded-lg p-1 text-xs outline-none shadow-xl z-50 min-h-[32px] relative"
                    rows={field === "ai_first_sentence" ? 3 : 1}
                />
            </div>
        );
    }

    return (
        <div 
            onClick={onClick}
            className={cn("cursor-pointer hover:bg-black/5 rounded px-1 -ml-1 transition-colors min-h-[1.2rem]", !value && "text-gray-300 italic", className)}
        >
            {value || placeholder}
        </div>
    );
}
