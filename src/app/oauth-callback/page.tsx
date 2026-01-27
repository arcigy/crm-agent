'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

function CallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<'LOADING' | 'SUCCESS' | 'ERROR'>('LOADING');
    const [message, setMessage] = useState('Prepájam Google účet...');
    const processedRef = useRef(false);

    useEffect(() => {
        if (!searchParams) return;
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        // Prevent double execution in React Strict Mode
        if (processedRef.current) return;

        if (error) {
            processedRef.current = true;
            setStatus('ERROR');
            setMessage(`Google Error: ${error}`);
            return;
        }

        if (!code) {
            // Wait a bit, sometimes searchParams is empty on first render
            return;
        }

        processedRef.current = true;

        // Send code to backend via POST (bypasses URL length limits)
        const exchangeCode = async () => {
            try {
                const res = await fetch('/api/google/exchange', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code })
                });

                const data = await res.json();

                if (res.ok && data.success) {
                    setStatus('SUCCESS');
                    setMessage('Úspešne prepojené!');
                    setTimeout(() => {
                        router.push('/dashboard?google_connected=true');
                    }, 1000);
                } else {
                    setStatus('ERROR');
                    setMessage(data.error || 'Serverová chyba pri výmene tokenu.');
                }
            } catch (err: any) {
                setStatus('ERROR');
                setMessage('Chyba siete: ' + err.message);
            }
        };

        exchangeCode();

    }, [searchParams, router]);

    return (
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center">
            {status === 'LOADING' && (
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                    <h2 className="text-xl font-bold text-gray-800">Pracujem...</h2>
                    <p className="text-gray-500 text-sm">{message}</p>
                </div>
            )}

            {status === 'SUCCESS' && (
                <div className="flex flex-col items-center gap-4">
                    <CheckCircle className="w-12 h-12 text-green-500" />
                    <h2 className="text-xl font-bold text-gray-800">Hotovo!</h2>
                    <p className="text-gray-500 text-sm">{message}</p>
                </div>
            )}

            {status === 'ERROR' && (
                <div className="flex flex-col items-center gap-4">
                    <XCircle className="w-12 h-12 text-red-500" />
                    <h2 className="text-xl font-bold text-gray-800">Chyba</h2>
                    <p className="text-red-500 text-sm font-medium">{message}</p>
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-bold text-gray-700"
                    >
                        Späť na Dashboard
                    </button>
                </div>
            )}
        </div>
    );
}

export default function OAuthCallbackPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <Suspense fallback={<div className="text-center p-4">Načítavam...</div>}>
                <CallbackContent />
            </Suspense>
        </div>
    );
}
