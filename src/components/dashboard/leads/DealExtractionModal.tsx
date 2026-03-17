import * as React from 'react';
import { X, Check, Briefcase, DollarSign, FileText, Loader2, Sparkles } from 'lucide-react';

interface DealExtractionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: any) => Promise<void>;
    extractedData: {
        name: string;
        value: number;
        currency?: string;
        description: string;
        contact_email?: string;
    };
}

export function DealExtractionModal({
    isOpen,
    onClose,
    onConfirm,
    extractedData
}: DealExtractionModalProps) {
    const [isSaving, setIsSaving] = React.useState(false);
    const [animate, setAnimate] = React.useState(false);
    const [formData, setFormData] = React.useState(extractedData);

    React.useEffect(() => {
        if (isOpen) {
            setFormData(extractedData);
            setTimeout(() => setAnimate(true), 100);
        } else {
            setAnimate(false);
        }
    }, [isOpen, extractedData]);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        setIsSaving(true);
        await onConfirm(formData);
        setIsSaving(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />
            <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">

                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-violet-50/30">
                    <h2 className="text-xl font-black text-gray-900 flex items-center gap-2 italic uppercase">
                        <Sparkles className="w-6 h-6 text-violet-600 animate-pulse" />
                        Nový Obchod (Deal)
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-violet-100 rounded-full transition-colors text-violet-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-8 overflow-y-auto thin-scrollbar space-y-6">
                    {/* Deal Name */}
                    <div className={`space-y-2 transition-all duration-700 delay-100 ${animate ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                        <label className="text-[10px] uppercase font-black tracking-widest text-violet-500/60 block ml-1">
                            Názov Obchodu
                        </label>
                        <div className="relative group">
                            <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-violet-400 group-focus-within:text-violet-600 transition-colors" />
                            <input 
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-violet-50/50 border-2 border-transparent focus:border-violet-100 focus:bg-white rounded-2xl py-4 pl-12 pr-4 text-gray-900 font-bold placeholder:text-gray-300 transition-all outline-none shadow-sm"
                                placeholder="Názov projektu alebo obchodu..."
                            />
                        </div>
                    </div>

                    {/* Value */}
                    <div className={`space-y-2 transition-all duration-700 delay-200 ${animate ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                        <label className="text-[10px] uppercase font-black tracking-widest text-violet-500/60 block ml-1">
                            Predpokladaná hodnota
                        </label>
                        <div className="relative group">
                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-violet-400 group-focus-within:text-violet-600 transition-colors" />
                            <input 
                                type="number"
                                value={formData.value}
                                onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-violet-50/50 border-2 border-transparent focus:border-violet-100 focus:bg-white rounded-2xl py-4 pl-12 pr-4 text-gray-900 font-bold placeholder:text-gray-300 transition-all outline-none shadow-sm"
                                placeholder="0.00"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-violet-600 text-sm italic">
                                EUR
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div className={`space-y-2 transition-all duration-700 delay-300 ${animate ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                        <label className="text-[10px] uppercase font-black tracking-widest text-violet-500/60 block ml-1">
                            Poznámky / Popis
                        </label>
                        <div className="relative group">
                            <FileText className="absolute left-4 top-4 w-5 h-5 text-violet-400 group-focus-within:text-violet-600 transition-colors" />
                            <textarea 
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full bg-violet-50/50 border-2 border-transparent focus:border-violet-100 focus:bg-white rounded-2xl py-4 pl-12 pr-4 text-gray-900 font-bold placeholder:text-gray-300 transition-all outline-none shadow-sm min-h-[120px]"
                                placeholder="Podrobnosti o obchode..."
                            />
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex flex-col gap-4">
                    <p className="text-[10px] text-center font-bold text-gray-400 uppercase tracking-tight">
                        Obchod bude priradený ku kontaktu: <span className="text-violet-600">{formData.contact_email}</span>
                    </p>
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-4 rounded-2xl font-black text-gray-400 hover:bg-violet-100 hover:text-violet-600 transition-all text-[11px] uppercase tracking-widest"
                        >
                            Zrušiť
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={isSaving}
                            className="flex-1 py-4 rounded-2xl bg-violet-600 text-white font-black uppercase tracking-widest text-[11px] hover:bg-violet-700 transition-all shadow-xl shadow-violet-600/20 active:scale-95 flex items-center justify-center gap-2 border-b-4 border-violet-800"
                        >
                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                            Vytvoriť Obchod
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default DealExtractionModal;
