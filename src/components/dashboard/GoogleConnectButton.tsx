'use client';

import { useState } from 'react';
import { Cloud, Check, Loader2, Activity } from 'lucide-react';
import { toast } from 'sonner';

export function GoogleConnectButton({ className = "" }: { className?: string }) {
    const [isLoading, setIsLoading] = useState(false);

    const handleTestStatus = async () => {
        setIsLoading(true);
        try {
            // TEST MODE: Only check status endpoint
            const res = await fetch('/api/google/status');

            if (!res.ok) {
                throw new Error(`Status Error: ${res.status}`);
            }

            const data = await res.json();
            console.log('Google Status Data:', data);

            if (data.status === 'alive') {
                toast.success('API Status: OK (Alive)', {
                    description: JSON.stringify(data, null, 2),
                    duration: 5000
                });
            } else {
                toast.warning('API Status: Unknown Response', { description: JSON.stringify(data) });
            }

        } catch (e: any) {
            console.error(e);
            toast.error('API Status: FAIL', { description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <button
            onClick={handleTestStatus}
            disabled={isLoading}
            className={`flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm ${className}`}
        >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4 text-orange-500" />}
            <span>Test Google API</span>
        </button>
    );
}

// Removing duplicate Setup Banner to clean up UI as requested
export function GoogleSetupBanner() {
    return null;
}
