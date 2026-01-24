'use client';

import * as React from 'react';
import { Smartphone, Check, Copy, Apple, ArrowRight } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function MobileSyncPage() {
    const [copied, setCopied] = React.useState(false);

    // In production, these should come from the user's session and env vars
    // In production, these should come from the user's session and env vars
    // Using local IP for dev testing
    const serverUrl = 'http://172.20.10.2:3000/api/dav';
    const username = 'user@example.com';
    const password = 'app-specific-password-123'; // This should be a generated App Password

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-black text-gray-900 mb-2">Mobile Sync</h1>
                <p className="text-gray-500 font-medium">Synchronizujte svoje kontakty s iPhonom alebo Androidom. Všetky zmeny sa prejavia obojsmerne.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* iOS Card */}
                <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 flex flex-col relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-gray-900 to-gray-700"></div>

                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
                            <Apple className="w-6 h-6 text-gray-900" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">iPhone / iPad</h2>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">iOS Native Sync</p>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center p-4">
                        <div className="bg-white p-4 rounded-2xl shadow-lg border border-gray-100 mb-6 group-hover:scale-105 transition-transform duration-300">
                            {/* iPhone Configuration Profile URL */}
                            <QRCodeSVG value={`http://172.20.10.2:3000/mobile-setup`} size={180} />
                        </div>
                        <p className="text-center text-sm font-medium text-gray-600 mb-6">
                            Naskenujte pre automatické nastavenie.<br />
                            <span className="text-xs text-gray-400">(Vyžaduje Safari)</span>
                        </p>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4 text-xs space-y-2 border border-gray-100">
                        <p className="font-bold text-gray-900 mb-1">Manuálne nastavenie:</p>
                        <ol className="list-decimal list-inside space-y-1 text-gray-600">
                            <li>Nastavenia &rarr; Kontakty &rarr; Účty</li>
                            <li>Pridať účet &rarr; Iné &rarr; Účet CardDAV</li>
                            <li>Zadajte Server, Meno a Heslo (vpravo)</li>
                        </ol>
                    </div>
                </div>

                {/* Android Card */}
                <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-500 to-emerald-600"></div>

                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center">
                            <Smartphone className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Android</h2>
                            <p className="text-xs font-bold text-green-600 uppercase tracking-wider">Via DAVx5 App</p>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center p-4">
                        <div className="bg-white p-4 rounded-2xl shadow-lg border border-gray-100 mb-6 hover:scale-105 transition-transform duration-300">
                            {/* Generic DAV URL */}
                            <QRCodeSVG value={serverUrl} size={180} />
                        </div>
                        <p className="text-center text-sm font-medium text-gray-600 mb-6">
                            Naskenujte v aplikácii <strong>DAVx5</strong><br />
                            <span className="text-xs text-gray-400">(Dostupná v Google Play)</span>
                        </p>
                    </div>
                </div>

            </div>

            {/* Connection Details */}
            <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-[100px] opacity-20 -mr-16 -mt-16 pointer-events-none"></div>

                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                    Connection Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Server URL</label>
                        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => copyToClipboard(serverUrl)}>
                            <code className="text-sm font-mono text-blue-300 truncate">{serverUrl}</code>
                            <Copy className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Username</label>
                        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => copyToClipboard(username)}>
                            <code className="text-sm font-mono text-white truncate">{username}</code>
                            <Copy className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Password</label>
                        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => copyToClipboard(password)}>
                            <code className="text-sm font-mono text-emerald-300 truncate tracking-widest">••••••••••••</code>
                            <Copy className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <button className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-300 hover:bg-slate-700 ml-auto">Reveal</button>
                        </div>
                    </div>
                </div>

                {copied && (
                    <div className="absolute bottom-4 right-8 bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-full animate-in fade-in slide-in-from-bottom-2">
                        Copied to clipboard!
                    </div>
                )}
            </div>
        </div>
    );
}
