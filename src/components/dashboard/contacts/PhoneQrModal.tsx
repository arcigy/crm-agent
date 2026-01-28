'use client';

import * as React from 'react';
import { X, Phone } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface PhoneQrModalProps {
    phone: string | null;
    onClose: () => void;
}

export function PhoneQrModal({ phone, onClose }: PhoneQrModalProps) {
    if (!phone) return null;

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="absolute inset-0" onClick={onClose} />
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xs overflow-hidden relative transform transition-all animate-in zoom-in-95 duration-500 border border-gray-100">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <Phone className="w-4 h-4 text-blue-500" /> Call Contact
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>
                <div className="p-8 flex flex-col items-center gap-6">
                    <div className="p-4 bg-white rounded-xl shadow-inner border border-gray-100">
                        <QRCodeSVG value={`tel:${phone}`} size={180} />
                    </div>
                    <div className="text-center">
                        <p className="text-sm text-gray-500 mb-1">Scan this code with your phone</p>
                        <p className="text-lg font-bold text-gray-900 tracking-tight">{phone}</p>
                    </div>
                    <a
                        href={`tel:${phone}`}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
                    >
                        <Phone className="w-4 h-4" /> Call Now
                    </a>
                </div>
            </div>
        </div>
    );
}
