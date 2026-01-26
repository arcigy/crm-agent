'use client';

import { useState, useEffect } from 'react';
import { Cloud, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams } from 'next/navigation';
// We import signIn from next-auth/react for client side
import { signIn } from "next-auth/react"

export function GoogleConnectButton({ className = "" }: { className?: string }) {
    const [isLoading, setIsLoading] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const searchParams = useSearchParams();

    useEffect(() => {
        if (searchParams.get('google_connected') === 'true') {
            setIsConnected(true);
            toast.success('Google účet prepojený (NextAuth)!');
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
        }
    }, [searchParams]);

    const handleConnect = async () => {
        setIsLoading(true);
        try {
            // NextAuth Magic
            await signIn("google", { callbackUrl: "/dashboard?google_connected=true" });
            // Note: signIn redirects, so code below might not run immediately
        } catch (e: any) {
            console.error(e);
            toast.error('Chyba Auth', { description: e.message });
            setIsLoading(false);
        }
    };

    if (isConnected) {
        return (
            <button
                disabled
                className={`flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-sm font-bold text-green-700 shadow-sm cursor-default ${className}`}
            >
                <Check className="w-4 h-4" />
                <span>Google Pripojený</span>
            </button>
        );
    }

    return (
        <button
            onClick={handleConnect}
            disabled={isLoading}
            className={`flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm ${className}`}
        >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4 text-blue-500" />}
            <span>Prepojiť Google (NextAuth)</span>
        </button>
    );
}

export function GoogleSetupBanner() { return null; }
