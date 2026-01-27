import * as React from 'react';
import { X, Check, User, Building2, Phone, Mail, Loader2 } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog'; // Assuming we might have a dialog primitive, but I'll build a raw modal to be safe and dependency-free if needed.
import { cn } from '@/lib/utils'; // Assuming this exists or I'll inline it.

// Mocking cn if it doesn't exist efficiently in prompt context, 
// but typically shadcn projects have it. I'll use a safe inline version if I'm not sure.
function safeCn(...classes: (string | undefined | null | false)[]) {
    return classes.filter(Boolean).join(' ');
}

interface ContactExtractionModaProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    emailBody: string;
    extractedData: {
        name: string;
        email: string;
        phone: string;
        company: string;
    };
}

export function ContactExtractionModal({
    isOpen,
    onClose,
    onConfirm,
    emailBody,
    extractedData
}: ContactExtractionModaProps) {
    const [isSaving, setIsSaving] = React.useState(false);
    const [animate, setAnimate] = React.useState(false);

    React.useEffect(() => {
        if (isOpen) {
            // Trigger animation shortly after mount
            setTimeout(() => setAnimate(true), 100);
        } else {
            setAnimate(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        setIsSaving(true);
        await onConfirm();
        setIsSaving(false);
        onClose();
    };

    // Helper to highlight text
    const renderHighlightedText = () => {
        if (!emailBody) return "";

        let parts = [{ text: emailBody, type: 'text' }];

        const highlights = [
            { text: extractedData.name, color: 'text-red-600 bg-red-100', border: 'border-red-200', type: 'name' },
            { text: extractedData.email, color: 'text-green-600 bg-green-100', border: 'border-green-200', type: 'email' },
            { text: extractedData.phone, color: 'text-blue-600 bg-blue-100', border: 'border-blue-200', type: 'phone' },
            { text: extractedData.company, color: 'text-orange-600 bg-orange-100', border: 'border-orange-200', type: 'company' },
        ].filter(h => h.text && h.text.length > 2 && h.text !== '—' && h.text !== 'Neznáma' && h.text !== 'Nenašlo sa');

        // Simple multipass replacement strategy
        highlights.forEach(h => {
            const newParts: any[] = [];
            parts.forEach(part => {
                if (part.type !== 'text') {
                    newParts.push(part);
                    return;
                }

                // Case insensitive match
                const regex = new RegExp(`(${h.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                const split = part.text.split(regex);

                split.forEach((s) => {
                    if (!s) return;
                    if (s.toLowerCase() === h.text.toLowerCase()) {
                        newParts.push({ text: s, type: 'highlight', color: h.color, border: h.border });
                    } else {
                        newParts.push({ text: s, type: 'text' });
                    }
                });
            });
            parts = newParts;
        });

        return parts.map((part, i) => {
            if (part.type === 'highlight') {
                return (
                    <span
                        key={i}
                        className={`
                            ${part.color} px-1 rounded mx-0.5 border ${part.border} font-bold
                            transition-all duration-1000 ease-out
                            ${animate ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
                        `}
                    >
                        {part.text}
                    </span>
                );
            }
            // Limit text length for viewing comfort
            return <span key={i} className="text-gray-500">{part.text}</span>;
        });
    };

    // Limit body preview
    const truncatedBody = emailBody.length > 500 ? emailBody.substring(0, 500) + '...' : emailBody;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                        <User className="w-5 h-5 text-indigo-600" />
                        Nájdený Kontakt
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">

                    {/* 1. Fields Visualizer */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        {/* Name - Red */}
                        <div className={`p-4 rounded-xl border-2 transition-all duration-700 delay-100 ${animate ? 'border-red-100 bg-red-50/50 translate-x-0 opacity-100' : 'border-transparent bg-transparent -translate-x-4 opacity-0'}`}>
                            <div className="text-[10px] uppercase font-bold text-red-400 mb-1 flex items-center gap-1">
                                <User className="w-3 h-3" /> Meno
                            </div>
                            <div className="text-lg font-black text-gray-900 truncate">
                                {extractedData.name || <span className="text-gray-300 italic">Nenašlo sa</span>}
                            </div>
                        </div>

                        {/* Company - Orange */}
                        <div className={`p-4 rounded-xl border-2 transition-all duration-700 delay-200 ${animate ? 'border-orange-100 bg-orange-50/50 translate-x-0 opacity-100' : 'border-transparent bg-transparent translate-x-4 opacity-0'}`}>
                            <div className="text-[10px] uppercase font-bold text-orange-400 mb-1 flex items-center gap-1">
                                <Building2 className="w-3 h-3" /> Spoločnosť
                            </div>
                            <div className="text-lg font-black text-gray-900 truncate">
                                {extractedData.company && extractedData.company !== '—' ? extractedData.company : <span className="text-gray-300 italic">Neznáma</span>}
                            </div>
                        </div>

                        {/* Email - Green */}
                        <div className={`p-4 rounded-xl border-2 transition-all duration-700 delay-300 ${animate ? 'border-green-100 bg-green-50/50 translate-x-0 opacity-100' : 'border-transparent bg-transparent -translate-x-4 opacity-0'}`}>
                            <div className="text-[10px] uppercase font-bold text-green-500 mb-1 flex items-center gap-1">
                                <Mail className="w-3 h-3" /> E-mail
                            </div>
                            <div className="text-lg font-bold text-gray-900 truncate">
                                {extractedData.email || <span className="text-gray-300 italic">Nenašlo sa</span>}
                            </div>
                        </div>

                        {/* Phone - Blue */}
                        <div className={`p-4 rounded-xl border-2 transition-all duration-700 delay-400 ${animate ? 'border-blue-100 bg-blue-50/50 translate-x-0 opacity-100' : 'border-transparent bg-transparent translate-x-4 opacity-0'}`}>
                            <div className="text-[10px] uppercase font-bold text-blue-400 mb-1 flex items-center gap-1">
                                <Phone className="w-3 h-3" /> Telefón
                            </div>
                            <div className="text-lg font-bold text-gray-900 truncate">
                                {extractedData.phone && extractedData.phone !== '—' ? extractedData.phone : <span className="text-gray-300 italic">Nenašlo sa</span>}
                            </div>
                        </div>
                    </div>

                    {/* 2. Source Context - Visual Connection */}
                    <div className="relative">
                        <div className="absolute -top-3 left-4 bg-white px-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                            Zdroj informácií
                        </div>
                        <div className="p-5 rounded-xl bg-gray-50 border border-gray-100 text-sm leading-relaxed font-medium text-gray-400 font-mono whitespace-pre-wrap">
                            {renderHighlightedText()}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors text-sm"
                    >
                        Zrušiť
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isSaving}
                        className="px-8 py-3 rounded-xl bg-gray-900 text-white font-bold hover:bg-black transition-all shadow-lg shadow-gray-200 active:scale-95 flex items-center gap-2"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Potvrdiť a pridať kontakt
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ContactExtractionModal;
