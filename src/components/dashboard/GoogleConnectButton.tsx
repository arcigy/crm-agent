'use client';

import { useState, useEffect } from 'react';
import { Cloud, Check, Loader2, Unplug } from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams, useRouter } from 'next/navigation';

export function GoogleConnectButton({ className = "" }: { className?: string }) {
    const [isLoading, setIsLoading] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const searchParams = useSearchParams();
    const router = useRouter();

    useEffect(() => {
        // Check if redirected from successful auth
        if (searchParams.get('google_connected') === 'true') {
            setIsConnected(true);
            toast.success('Google účet úspešne prepojený!', {
                description: 'Teraz môžete využívať kalendár a email.',
                duration: 5000
            });
            // Clean URL without refresh
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
        }
    }, [searchParams]);

    const handleConnect = async () => {
        setIsLoading(true);
        try {
            // Call our auth generator
            const res = await fetch('/api/google/auth?redirect=' + window.location.pathname);
            const data = await res.json();

            if (data.authUrl) {
                // Redirect user to Google
                window.location.href = data.authUrl;
            } else {
                throw new Error('No Auth URL returned');
            }
        } catch (e: any) {
            console.error(e);
            toast.error('Chyba pripojenia', { description: e.message });
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
            <span>Prepojiť Google</span>
        </button>
    );
}

// Removing duplicate Setup Banner to clean up UI as requested
export function GoogleSetupBanner() {
    return null;
}
