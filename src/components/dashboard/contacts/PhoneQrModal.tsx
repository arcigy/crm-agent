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
        <div className="fixed bottom-6 right-6 z-[250] flex animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className="bg-zinc-900 bg-opacity-95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-violet-900/20 w-80 overflow-hidden relative transform transition-all border border-violet-500/30">
                <div className="p-4 border-b border-violet-500/20 flex items-center justify-between">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <Phone className="w-4 h-4 text-violet-400" /> Zavolať
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-5 h-5 text-zinc-400 hover:text-white" />
                    </button>
                </div>
                <div className="p-6 flex flex-col items-center gap-5">
                    <div className="p-3 bg-white rounded-xl shadow-inner transition-transform hover:scale-105 duration-300">
                        <QRCodeSVG value={`tel:${phone}`} size={160} />
                    </div>
                    <div className="text-center w-full">
                        <p className="text-xs text-zinc-400 mb-1">Naskenujte si kód telefónom</p>
                        <div className="bg-black/30 rounded-lg py-2 border border-white/5">
                             <p className="text-xl font-black text-white tracking-widest">{phone}</p>
                        </div>
                    </div>
                    <a
                        href={`tel:${phone}`}
                        className="w-full bg-violet-600 hover:bg-violet-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(124,58,237,0.3)] active:scale-95"
                    >
                        <Phone className="w-4 h-4 fill-white text-white" /> ZAVOLAŤ TERAZ
                    </a>
                </div>
            </div>
        </div>
    );
}
