'use client';

import { useState, useRef } from 'react';
import { Upload, X, FileText, Check, AlertCircle, Cloud, ChevronRight, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface ContactImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

type Step = 'upload' | 'map' | 'confirm';

export function ContactImportModal({ isOpen, onClose, onSuccess }: ContactImportModalProps) {
    const [step, setStep] = useState<Step>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [googleStatus, setGoogleStatus] = useState<'idle' | 'loading'>('idle');
    const [headers, setHeaders] = useState<string[]>([]);
    const [previewRows, setPreviewRows] = useState<any[]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        company: ''
    });
    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
    const [globalStatus, setGlobalStatus] = useState<'published' | 'draft'>('published');
    const [processedRows, setProcessedRows] = useState<any[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleGoogleImport = async () => {
        setGoogleStatus('loading');
        try {
            const { importGoogleContacts } = await import('@/app/actions/contacts');
            const res = await importGoogleContacts();

            if (res.success) {
                toast.success(`Google Sync: ${res.count} kontaktov importovaných.`);
                onSuccess();
                onClose();
            } else {
                toast.error('Google Import zlyhal: ' + res.error);
            }
        } catch (e) {
            console.error(e);
            toast.error('Chyba komunikácie so serverom.');
        } finally {
            setGoogleStatus('idle');
        }
    };

    const processFile = async (selectedFile: File) => {
        const name = selectedFile.name.toLowerCase();
        if (name.endsWith('.vcf') || name.endsWith('.vcard')) {
            // vCard handling remains simple - auto parse
            const text = await selectedFile.text();
            const { parseVCard } = await import('@/lib/vcard-client');
            const parsed = parseVCard(text);
            if (parsed.length > 0) {
                setPreviewRows(parsed);
                setFile(selectedFile);
                setStep('confirm');
            } else {
                toast.error('Vcard neobsahuje platné kontakty');
            }
        } else if (name.endsWith('.csv')) {
            const text = await selectedFile.text();
            Papa.parse(text, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    setHeaders(results.meta.fields || []);
                    setPreviewRows(results.data.slice(0, 5));
                    setFile(selectedFile);
                    setStep('map');
                    // Auto-detect mapping
                    const newMapping = { ...mapping };
                    (results.meta.fields || []).forEach(h => {
                        const low = h.toLowerCase();
                        if (low.includes('first') || low.includes('meno')) newMapping.first_name = h;
                        if (low.includes('last') || low.includes('priezvisko')) newMapping.last_name = h;
                        if (low.includes('email') || low.includes('mail')) newMapping.email = h;
                        if (low.includes('phone') || low.includes('tel') || low.includes('mobil')) newMapping.phone = h;
                        if (low.includes('company') || low.includes('firm') || low.includes('org')) newMapping.company = h;
                    });
                    setMapping(newMapping);
                    // Initialize selection and processed rows
                    setSelectedRows(new Set(results.data.map((_, i) => i)));
                    setProcessedRows(results.data);
                }
            });
        } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
            const buffer = await selectedFile.arrayBuffer();
            const workbook = XLSX.read(buffer);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const data: any[] = XLSX.utils.sheet_to_json(sheet);
            if (data.length > 0) {
                const sheetHeaders = Object.keys(data[0]);
                setHeaders(sheetHeaders);
                setPreviewRows(data.slice(0, 5));
                setFile(selectedFile);
                setStep('map');
                setSelectedRows(new Set(data.map((_, i) => i)));
                setProcessedRows(data);
            }
        } else {
            toast.error('Nepodporovaný formát súboru');
        }
    };

    const handleImport = async () => {
        setIsUploading(true);
        try {
            let contactsToUpload: any[] = [];

            if (step === 'map' && file) {
                // Re-parse the whole file and apply mapping
                const name = file.name.toLowerCase();
                let rawData: any[] = [];

                if (name.endsWith('.csv')) {
                    const text = await file.text();
                    const result = Papa.parse(text, { header: true, skipEmptyLines: true });
                    rawData = result.data;
                } else {
                    const buffer = await file.arrayBuffer();
                    const workbook = XLSX.read(buffer);
                    rawData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                }

                contactsToUpload = Array.from(selectedRows).map(index => {
                    const row = processedRows[index];
                    return {
                        first_name: row[mapping.first_name] || '',
                        last_name: row[mapping.last_name] || '',
                        email: row[mapping.email] || '',
                        phone: row[mapping.phone] || '',
                        company: row[mapping.company] || '',
                        status: globalStatus
                    };
                });
            } else {
                contactsToUpload = previewRows;
            }

            const { bulkCreateContacts } = await import('@/app/actions/contacts');
            const res = await bulkCreateContacts(contactsToUpload);

            if (res.success) {
                toast.success(`Importovaných ${res.count} kontaktov.`);
                onSuccess();
                onClose();
            } else {
                toast.error('Import zlyhal: ' + res.error);
            }
        } catch (e: any) {
            toast.error('Chyba: ' + e.message);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="absolute inset-0" onClick={onClose}></div>
            <div className={`bg-white w-full ${step === 'map' ? 'max-w-4xl' : 'max-w-xl'} rounded-[3rem] shadow-2xl overflow-hidden flex flex-col relative transform transition-all animate-in zoom-in-95 duration-500 border border-gray-100`}>

                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div>
                        <h3 className="font-black text-xl text-gray-900 tracking-tight">
                            {step === 'upload' ? 'Import kontaktov' : step === 'map' ? 'Priradenie stĺpcov' : 'Potvrdenie importu'}
                        </h3>
                        <div className="flex gap-2 mt-1">
                            <div className={`h-1 w-8 rounded-full ${step === 'upload' ? 'bg-blue-600' : 'bg-green-500'}`} />
                            <div className={`h-1 w-8 rounded-full ${step === 'map' ? 'bg-blue-600' : step === 'confirm' ? 'bg-green-500' : 'bg-gray-200'}`} />
                            <div className={`h-1 w-8 rounded-full ${step === 'confirm' ? 'bg-blue-600' : 'bg-gray-200'}`} />
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-xl shadow-sm border border-gray-100 transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto max-h-[70vh]">
                    {step === 'upload' && (
                        <div className="p-8 space-y-8">
                            {/* Google Option */}
                            <button
                                onClick={handleGoogleImport}
                                disabled={googleStatus === 'loading'}
                                className="w-full p-6 rounded-[2rem] bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-100/50 hover:border-blue-300 transition-all group relative overflow-hidden text-left"
                            >
                                <div className="relative z-10 flex items-center gap-6">
                                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-lg group-hover:scale-110 transition-transform">
                                        <Cloud className="w-8 h-8" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-black text-blue-900 text-lg">Google Sync</h4>
                                        <p className="text-blue-600/60 text-xs font-bold uppercase tracking-widest">Automatický import z účtu</p>
                                    </div>
                                    <ChevronRight className="w-6 h-6 text-blue-300 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </button>

                            <div className="relative flex justify-center py-2">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
                                <span className="px-4 bg-white text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] relative z-10">alebo nahrajte súbor</span>
                            </div>

                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-4 border-dashed border-gray-100 rounded-[3rem] p-12 flex flex-col items-center text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all group"
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept=".vcf,.csv,.xlsx,.xls"
                                    onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
                                />
                                <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center text-gray-300 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                                    <Upload className="w-10 h-10" />
                                </div>
                                <p className="text-xl font-black text-gray-900 mb-2">Kliknite sem</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Podporujeme vCard, CSV a Excel</p>
                            </div>
                        </div>
                    )}

                    {step === 'map' && (
                        <div className="p-8">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-xs font-black uppercase tracking-[0.3em] text-gray-400">Priradenie polí</h4>
                                        <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-2xl border border-gray-100">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Importovať ako:</span>
                                            <select
                                                value={globalStatus}
                                                onChange={(e) => setGlobalStatus(e.target.value as any)}
                                                className="bg-white border-2 border-gray-100 rounded-xl px-3 py-1 text-[10px] font-black uppercase tracking-widest outline-none focus:border-blue-500"
                                            >
                                                <option value="published">🟢 Active</option>
                                                <option value="draft">🟡 Inactive</option>
                                            </select>
                                        </div>
                                    </div>
                                    {Object.keys(mapping).map((field) => (
                                        <div key={field} className="space-y-2">
                                            <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1">
                                                {field.replace('_', ' ')}
                                            </label>
                                            <select
                                                value={mapping[field]}
                                                onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}
                                                className="w-full h-14 bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 font-bold text-sm focus:border-blue-500 focus:bg-white transition-all outline-none"
                                            >
                                                <option value="">-- Vynechať --</option>
                                                {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                            </select>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-xs font-black uppercase tracking-[0.3em] text-gray-400">Výber a náhľad ({selectedRows.size}/{processedRows.length})</h4>
                                        <button
                                            onClick={() => {
                                                if (selectedRows.size === processedRows.length) setSelectedRows(new Set());
                                                else setSelectedRows(new Set(processedRows.map((_, i) => i)));
                                            }}
                                            className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-800"
                                        >
                                            {selectedRows.size === processedRows.length ? 'Odznačiť všetko' : 'Označiť všetko'}
                                        </button>
                                    </div>
                                    <div className="bg-gray-900 rounded-[2.5rem] p-6 shadow-2xl overflow-hidden border border-white/10">
                                        <div className="overflow-x-auto max-h-[400px]">
                                            <table className="w-full text-left">
                                                <thead className="sticky top-0 bg-gray-900 z-10">
                                                    <tr>
                                                        <th className="pb-4 w-10"></th>
                                                        {headers.slice(0, 4).map(h => (
                                                            <th key={h} className="pb-4 text-[9px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5">{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {processedRows.slice(0, 50).map((row, i) => (
                                                        <tr key={i} className={`group hover:bg-white/5 transition-colors cursor-pointer ${selectedRows.has(i) ? 'bg-blue-500/5' : ''}`} onClick={() => {
                                                            const newSet = new Set(selectedRows);
                                                            if (newSet.has(i)) newSet.delete(i);
                                                            else newSet.add(i);
                                                            setSelectedRows(newSet);
                                                        }}>
                                                            <td className="py-3 pr-2">
                                                                <div className={`w-4 h-4 rounded-md border-2 transition-all flex items-center justify-center ${selectedRows.has(i) ? 'bg-blue-500 border-blue-500' : 'border-white/10 group-hover:border-white/30'}`}>
                                                                    {selectedRows.has(i) && <Check className="w-3 h-3 text-white" />}
                                                                </div>
                                                            </td>
                                                            {headers.slice(0, 4).map(h => (
                                                                <td key={h} className="py-3 text-[10px] text-gray-300 font-mono truncate max-w-[120px]">{row[h]}</td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        {processedRows.length > 50 && (
                                            <p className="mt-4 text-[9px] text-center font-bold text-gray-500 uppercase tracking-widest italic">+ {processedRows.length - 50} ďalších riadkov...</p>
                                        )}
                                        <div className="mt-4 pt-4 border-t border-white/5 text-center">
                                            <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest flex items-center justify-center gap-2">
                                                {file?.name} • {(file?.size || 0 / 1024).toFixed(1)} KB
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'confirm' && (
                        <div className="p-12 text-center">
                            <div className="w-24 h-24 bg-green-50 rounded-[2rem] flex items-center justify-center text-green-600 mx-auto mb-8 shadow-sm">
                                <Check className="w-12 h-12" />
                            </div>
                            <h4 className="text-3xl font-black text-gray-900 mb-4 tracking-tight uppercase italic">Pripravené na import</h4>
                            <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[11px] mb-8 leading-relaxed">
                                Našli sme <span className="text-blue-600">{previewRows.length}</span> kontaktov v súbore <span className="text-gray-900">"{file?.name}"</span>.
                            </p>

                            <div className="max-w-xs mx-auto space-y-3">
                                {previewRows.slice(0, 3).map((c, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[10px] font-black shadow-sm shrink-0">{(c.first_name?.[0] || '?') + (c.last_name?.[0] || '')}</div>
                                        <div className="text-left overflow-hidden">
                                            <p className="text-xs font-black text-gray-900 truncate leading-none mb-1">{c.first_name} {c.last_name}</p>
                                            <p className="text-[9px] text-gray-400 truncate tracking-widest uppercase font-bold">{c.email}</p>
                                        </div>
                                    </div>
                                ))}
                                {previewRows.length > 3 && <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mt-4">A ďalších {previewRows.length - 3}...</p>}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors"
                    >
                        Zrušiť
                    </button>
                    {step !== 'upload' && (
                        <button
                            onClick={handleImport}
                            disabled={isUploading}
                            className="px-10 py-4 bg-gray-900 hover:bg-black text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-gray-200 transition-all flex items-center gap-3 active:scale-95 disabled:opacity-50"
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Spracúvam
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
