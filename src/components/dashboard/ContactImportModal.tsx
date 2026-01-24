'use client';

import { useState, useRef } from 'react';
import { Upload, X, FileText, Check, AlertCircle } from 'lucide-react';
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
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

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
            const text = await file.text();

            // Dynamic import of the action to ensure we use the one we just created
            const { uploadVCard } = await import('@/app/actions/contacts');

            const result = await uploadVCard(text);

            if (result.success) {
                toast.success(`Importované: ${result.count}, Chyby: ${result.failed || 0}`);
                onSuccess();
                onClose();
            } else {
                throw new Error(result.error || 'Upload failed');
            }
        } catch (error) {
            console.error('Import failed', error);
            toast.error('Chyba pri importe. Skúste to prosím znova.');
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
