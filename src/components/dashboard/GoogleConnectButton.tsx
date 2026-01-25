'use client';

import { useState } from 'react';
import { Cloud, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function GoogleConnectButton({ className = "" }: { className?: string }) {
    const [isLoading, setIsLoading] = useState(false);

    const handleConnect = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/google/auth?redirect=/dashboard');
            const data = await res.json();
            if (data.authUrl) {
                window.location.href = data.authUrl;
            } else {
                toast.error('Nepodarilo sa získať autorizačnú URL.');
                setIsLoading(false);
            }
        } catch (e) {
            console.error(e);
            toast.error('Chyba komunikácie.');
            setIsLoading(false);
        }
    };

    return (
        <button
            onClick={handleConnect}
            disabled={isLoading}
            className={`flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm ${className}`}
        >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4 text-blue-500" />}
            <span>Prepojiť Google</span>
        </button>
    );
}

export function GoogleSetupBanner() {
    return (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0 backdrop-blur-sm">
                    <Cloud className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h3 className="text-lg font-black tracking-tight mb-1">Aktivujte si AI Asistenta</h3>
                    <p className="text-blue-100 text-sm font-medium leading-relaxed max-w-lg">
                        Prepojte svoj Google účet a získajte automatickú synchronizáciu emailov, kalendára, kontaktov a úloh. Váš CRM začne pracovať za vás.
                    </p>
                </div>
            </div>
            <div className="shrink-0">
                <GoogleConnectWrapper />
            </div>
        </div>
    );
}

function GoogleConnectWrapper() {
    const [isLoading, setIsLoading] = useState(false);

    const handleConnect = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/google/auth?redirect=/dashboard');
            const data = await res.json();
            if (data.authUrl) {
                window.location.href = data.authUrl;
            }
        } catch (e) {
            setIsLoading(false);
        }
    };

    return (
        <button
            onClick={handleConnect}
            className="bg-white text-blue-700 px-6 py-3 rounded-xl font-black uppercase tracking-wider shadow-lg hover:bg-blue-50 transition-all active:scale-95 flex items-center gap-2"
        >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
            Prepojiť s Google
        </button>
    )
}
