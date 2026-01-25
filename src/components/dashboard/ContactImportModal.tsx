'use client';

import { useState, useRef } from 'react';
import { Upload, X, FileText, Check, AlertCircle, Cloud } from 'lucide-react';
import { toast } from 'sonner';

interface ContactImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function ContactImportModal({ isOpen, onClose, onSuccess }: ContactImportModalProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [googleStatus, setGoogleStatus] = useState<'idle' | 'loading'>('idle');
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    // ... existing drag handlers ...

    const handleGoogleImport = async () => {
        setGoogleStatus('loading');
        try {
            // Dynamic import to call server action
            const { importGoogleContacts } = await import('@/app/actions/contacts');
            const res = await importGoogleContacts();

            if (res.success) {
                toast.success(`Google Import: Stiahnutých ${res.count} kontaktov.`);
                onSuccess();
                onClose();
            } else if (res.error === 'no_tokens' || res.error === 'scope_missing') {
                toast.error('Je potrebné prepojiť Google účet pre prístup ku kontaktom.');
                // Fetch auth url
                const authRes = await fetch('/api/google/auth');
                const { authUrl } = await authRes.json();
                if (authUrl) window.location.href = authUrl;
            } else {
                toast.error('Chyba pri Google importe: ' + res.error);
            }
        } catch (e) {
            console.error(e);
            toast.error('Chyba komunikácie so serverom.');
        } finally {
            setGoogleStatus('idle');
        }
    };


    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && (droppedFile.name.endsWith('.vcf') || droppedFile.name.endsWith('.csv'))) {
            setFile(droppedFile);
        } else {
            toast.error('Prosím nahrajte .vcf alebo .csv súbor');
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        try {
            // Use FormData to bypass message body limits (1MB default for JSON)
            const formData = new FormData();
            formData.append('file', file);

            // Dynamic import of the action
            const { uploadVCard } = await import('@/app/actions/contacts');

            // @ts-ignore - We are changing the signature to accept FormData in the next step
            const result = await uploadVCard(formData);

            if (result.success) {
                toast.success(`Importované: ${result.count}, Chyby: ${result.failed || 0}`);
                onSuccess();
                onClose();
            } else {
                throw new Error(result.error || 'Upload failed');
            }
        } catch (error: any) {
            console.error('Import failed', error);
            // Better error message for payload too large
            if (error.message?.includes('413') || error.digest?.includes('413')) {
                toast.error('Súbor je príliš veľký. Skúste menší súbor.');
            } else {
                toast.error('Chyba pri importe. Skúste to prosím znova.');
            }
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col transform transition-all animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <h3 className="font-bold text-lg text-gray-900">Import Kontaktov</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8">
                    {/* Google Import Button */}
                    <div className="mb-4">
                        <button
                            type="button"
                            onClick={handleGoogleImport}
                            disabled={googleStatus === 'loading'}
                            className="w-full py-3 px-4 rounded-xl font-bold bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-3 shadow-sm active:scale-95 disabled:opacity-50"
                        >
                            {googleStatus === 'loading' ? (
                                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></span>
                            ) : (
                                <Cloud className="w-5 h-5 text-blue-500" />
                            )}
                            <span>Importovať z Google účtu</span>
                        </button>
                        <p className="text-[10px] text-gray-400 text-center mt-2 px-4">
                            Stiahne kontakty z vášho pripojeného Google/Gmail účtu.
                        </p>
                    </div>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                            <div className="w-full border-t border-gray-200"></div>
                        </div>
                        <div className="relative flex justify-center">
                            <span className="px-2 bg-white text-xs font-medium text-gray-500 uppercase tracking-wider">Alebo</span>
                        </div>
                    </div>
                    {!file ? (
                        <div
                            className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center transition-colors cursor-pointer
                                ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50/50'}
                            `}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".vcf,.vcard"
                                onChange={handleFileSelect}
                            />
                            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                                <Upload className="w-8 h-8" />
                            </div>
                            <p className="font-bold text-gray-900 mb-2">Kliknite alebo pretiahnite súbor</p>
                            <p className="text-sm text-gray-500">Podporované formáty: <span className="font-mono text-gray-700 bg-gray-100 px-1 rounded">.vcf</span> (vCard)</p>
                        </div>
                    ) : (
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-4">
                            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-blue-100 shadow-sm shrink-0">
                                <FileText className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-900 truncate">{file.name}</p>
                                <p className="text-xs text-blue-600 font-medium uppercase tracking-wider">{(file.size / 1024).toFixed(1)} KB</p>
                            </div>
                            <button onClick={() => setFile(null)} className="p-1 hover:bg-blue-100 rounded text-blue-400 hover:text-blue-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    {/* Native Contact Picker Button (Mobile Only Support usually) */}
                    <div className="mb-6">
                        <button
                            type="button"
                            onClick={async () => {
                                try {
                                    // Feature check
                                    // @ts-ignore
                                    if (!window.ContactsManager && !('contacts' in navigator && 'ContactsManager' in window)) {
                                        toast.error('Váš prehliadač nepodporuje priamy výber kontaktov. Použite Import súboru.');
                                        return;
                                    }

                                    const props = ['name', 'email', 'tel'];
                                    const opts = { multiple: true };

                                    // @ts-ignore
                                    const contacts = await navigator.contacts.select(props, opts);

                                    if (contacts && contacts.length > 0) {
                                        setIsUploading(true);
                                        const { bulkCreateContacts } = await import('@/app/actions/contacts');
                                        const res = await bulkCreateContacts(contacts);
                                        if (res.success) {
                                            toast.success(`Importované: ${res.count} kontaktov.`);
                                            onSuccess();
                                            onClose();
                                        } else {
                                            toast.error('Chyba pri importe.');
                                        }
                                        setIsUploading(false);
                                    }
                                } catch (e) {
                                    console.error(e);
                                    // Silent fail or toast if user cancelled
                                }
                            }}
                            className="w-full py-4 text-center rounded-xl font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 transition-colors flex flex-col items-center justify-center gap-2"
                        >
                            <span className="text-sm">📱 Otvoriť zoznam kontaktov v telefóne</span>
                        </button>
                        <div className="text-center my-4 overflow-hidden">
                            <span className="text-xs text-gray-400 uppercase tracking-widest px-2 bg-white relative z-10">alebo nahrajte súbor</span>
                            <div className="border-t border-gray-100 -mt-2.5"></div>
                        </div>
                    </div>

                    <div className="mt-6 flex items-start gap-3 p-3 bg-amber-50 text-amber-800 rounded-lg text-xs leading-relaxed border border-amber-100">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <p>
                            Tip: Na iPhone otvorte <strong>Kontakty</strong>, vyberte kontakty (potiahnutím dvoch prstov), zvoľte <strong>Zdieľať</strong> a uložte do Súborov. Potom tento súbor nahrajte sem.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Zrušiť
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={!file || isUploading}
                        className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-lg shadow-blue-200 disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
                    >
                        {isUploading ? 'Nahrávam...' : 'Importovať Kontakty'}
                    </button>
                </div>
            </div>
        </div>
    );
}
