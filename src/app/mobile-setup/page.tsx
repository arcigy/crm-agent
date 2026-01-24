'use client';

import * as React from 'react';
import { Apple, Copy, Check, AlertTriangle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function MobileSetupPage() {
    const [copied, setCopied] = React.useState(false);

    // Hardcoded IP for dev environment
    const profileUrl = 'http://172.20.10.2:3000/api/ios-profile';

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(profileUrl);
            setCopied(true);
        } catch (err) {
            // Fallback for HTTP (non-secure context)
            const textArea = document.createElement("textarea");
            textArea.value = profileUrl;

            // Ensure it's not visible but part of DOM
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            textArea.style.top = "0";
            document.body.appendChild(textArea);

            textArea.focus();
            textArea.select();

            try {
                document.execCommand('copy');
                setCopied(true);
            } catch (e) {
                console.error('Copy failed', e);
                alert('Copy failed manually selecting text');
            }

            document.body.removeChild(textArea);
        }

        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
            <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">

                {/* Header */}
                <div className="bg-slate-900 p-8 text-center text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-[60px] opacity-30 -mr-10 -mt-10"></div>
                    <div className="w-16 h-16 bg-white/10 rounded-2xl mx-auto flex items-center justify-center mb-4 backdrop-blur-sm">
                        <Apple className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-black mb-1">CRM Sync</h1>
                    <p className="text-slate-400 text-sm font-medium">iOS Configuration</p>
                </div>

                {/* Body */}
                <div className="p-8 space-y-6">

                    <div className="flex bg-amber-50 p-4 rounded-xl border border-amber-100 gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-800 font-bold leading-relaxed">
                            Dôležité: Pre správnu inštaláciu profilu musíte túto stránku otvoriť v <span className="underline">Safari</span>.
                        </p>
                    </div>

                    <a
                        href={profileUrl}
                        className="flex items-center justify-center gap-2 w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-200 active:scale-95 transition-all"
                    >
                        Stiahnuť Profil
                    </a>

                    <div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-gray-200"></div>
                        <span className="flex-shrink-0 mx-4 text-gray-300 text-xs font-bold uppercase tracking-wider">Alebo</span>
                        <div className="flex-grow border-t border-gray-200"></div>
                    </div>

                    <button
                        onClick={copyLink}
                        className="flex items-center justify-center gap-2 w-full py-3 bg-white border-2 border-slate-100 hover:border-slate-200 text-slate-600 rounded-xl font-bold text-sm transition-all active:scale-95"
                    >
                        {copied ? (
                            <>
                                <Check className="w-4 h-4 text-green-500" />
                                <span className="text-green-600">Skopírované!</span>
                            </>
                        ) : (
                            <>
                                <Copy className="w-4 h-4" />
                                Kopírovať odkaz
                            </>
                        )}
                    </button>

                    <p className="text-center text-[10px] text-gray-400 leading-relaxed px-4">
                        Skopírujte odkaz a vložte ho manuálne do Safari, ak sťahovanie nezačne automaticky.
                    </p>

                </div>
            </div>
        </div>
    );
}
