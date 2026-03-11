'use client';

import * as React from 'react';
import { Smartphone, Copy, Apple, ArrowRight, Cloud, ShieldCheck, Zap, ArrowLeft, History } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useCurrentCRMUser } from '@/hooks/useCurrentCRMUser';
import { GoogleConnectButton } from "@/components/dashboard/GoogleConnectButton";
import Link from 'next/link';

export default function MobileSyncPage() {
    const { user, isLoaded } = useCurrentCRMUser();
    const [copied, setCopied] = React.useState(false);
    const [origin, setOrigin] = React.useState('');
    const [username, setUsername] = React.useState('user@example.com');

    React.useEffect(() => {
        setOrigin(window.location.origin);
        if (isLoaded && user?.primaryEmailAddress?.emailAddress) {
            setUsername(user.primaryEmailAddress.emailAddress);
        }
    }, [isLoaded, user]);

    const serverUrl = origin ? `${origin}/api/dav` : '';
    const password = 'heslo';

    const copyToClipboard = (text: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="max-w-6xl mx-auto animate-in fade-in duration-1000 pb-10 px-4 md:px-0 relative">
            {/* ── Background Ambiance (Grey Neon) ── */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/[0.01] rounded-full blur-[140px] pointer-events-none -z-10" />

            {/* ── Sync Hub Window ── */}
            <div className="bg-zinc-950/40 backdrop-blur-3xl border border-white/[0.03] rounded-[3rem] p-8 md:p-10 shadow-[0_40px_100px_rgba(0,0,0,0.6)] relative overflow-hidden">
                
                {/* Header */}
                <div className="flex items-center justify-between pb-8 border-b border-white/[0.03] mb-6">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-black tracking-tighter text-zinc-100 uppercase italic drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">
                                Synchronizácia <span className="text-zinc-100">a Prepojenie</span>
                            </h1>
                        </div>
                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.4em]">
                            Systém prepojenia s ArciGy Cloud a mobilnými zariadeniami
                        </p>
                    </div>
                    
                    <Link href="/dashboard/settings">
                        <button className="px-6 py-2.5 bg-violet-600/5 backdrop-blur-2xl border border-violet-500/20 rounded-2xl hover:bg-violet-600/15 hover:border-violet-400/40 transition-all flex items-center gap-2 group shadow-[0_0_15px_rgba(139,92,246,0.05)]">
                            <ArrowLeft className="w-3.5 h-3.5 text-violet-400 group-hover:text-violet-300 transition-colors" />
                            <span className="text-[8px] font-black uppercase tracking-widest text-violet-400 group-hover:text-violet-300 transition-colors">Back System</span>
                        </button>
                    </Link>
                </div>

                {/* Main Content Sections */}
                <div className="space-y-0 divide-y divide-white/[0.03]">
                    {/* iOS Section */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between py-6 gap-8 group">
                         <div className="flex items-start gap-5 flex-1 relative z-10">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-zinc-900 border border-white/10 shadow-xl">
                                <Apple className="w-5 h-5 text-zinc-400 group-hover:text-white transition-colors" strokeWidth={2.5} />
                            </div>
                            <div className="flex flex-col gap-1.5 pt-1">
                                <h3 className="text-sm font-black tracking-widest text-zinc-200 uppercase italic">Apple iOS Native</h3>
                                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest leading-relaxed max-w-sm">
                                    Prepojenie kalendára a kontaktov cez natívny protokol Apple.
                                </p>
                            </div>
                         </div>
                         <div className="flex items-center gap-8 relative z-10">
                            <div className="px-3 py-1.5 bg-white/[0.02] border border-white/5 rounded-xl">
                                <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 leading-none flex items-center gap-2">
                                    <Zap className="w-2.5 h-2.5" /> Safari Scan Only
                                </span>
                            </div>
                            <div className="p-1 bg-white rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                                <div className="p-2 bg-white rounded-xl">
                                    {origin && <QRCodeSVG value={`${origin}/mobile-setup`} size={70} bgColor="#ffffff" fgColor="#000000" />}
                                </div>
                            </div>
                         </div>
                    </div>

                    {/* Android Section */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between py-6 gap-8 group">
                         <div className="flex items-start gap-5 flex-1 relative z-10">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-zinc-900 border border-white/10 shadow-xl">
                                <Smartphone className="w-5 h-5 text-zinc-400 group-hover:text-white transition-colors" strokeWidth={2.5} />
                            </div>
                            <div className="flex flex-col gap-1.5 pt-1">
                                <h3 className="text-sm font-black tracking-widest text-zinc-200 uppercase italic">Android Sync</h3>
                                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest leading-relaxed max-w-sm">
                                    Synchronizácia cez DAVx5 protokol pre Android zariadenia.
                                </p>
                            </div>
                         </div>
                         <div className="flex items-center gap-8 relative z-10">
                             <div className="p-1 bg-white rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                                <div className="p-2 bg-white rounded-xl">
                                   <QRCodeSVG value={serverUrl} size={70} bgColor="#ffffff" fgColor="#000000" />
                                </div>
                            </div>
                         </div>
                    </div>

                    {/* Google Section */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between py-6 gap-8 group">
                         <div className="flex items-start gap-5 flex-1 relative z-10">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-zinc-900 border border-white/10 shadow-xl">
                                <Cloud className="w-5 h-5 text-zinc-400 group-hover:text-white transition-colors" strokeWidth={2.5} />
                            </div>
                            <div className="flex flex-col gap-1.5 pt-1">
                                <h3 className="text-sm font-black tracking-widest text-zinc-200 uppercase italic">G-Workspace Deep Sync</h3>
                                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest leading-relaxed max-w-sm">
                                    Hĺbková integrácia Gmailu a Kalendára pre AI analýzu.
                                </p>
                            </div>
                         </div>
                         <div className="max-w-[200px] w-full relative z-10">
                            <GoogleConnectButton className="w-full h-11 bg-zinc-100 hover:bg-white text-zinc-950 rounded-xl font-black uppercase tracking-widest text-[8px] transition-all border border-white/20 shadow-xl" showManageOptions={true} />
                         </div>
                    </div>
                </div>

                {/* Credentials Registry */}
                <div className="mt-6 bg-black/40 border border-white/5 rounded-[2rem] p-8 shadow-inner">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                            <ShieldCheck className="w-4 h-4 text-zinc-950" />
                        </div>
                        <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 italic">Auth_Credentials_Registry</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="space-y-3">
                            <label className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.4em] ml-1">Server_Endpoint</label>
                            <div className="flex items-center justify-between group/copy cursor-pointer bg-black/40 px-6 py-5 rounded-2xl border border-white/5 hover:border-zinc-500 transition-all shadow-inner" onClick={() => copyToClipboard(serverUrl)}>
                                <span className="text-[10px] font-black text-zinc-100 truncate pr-4">{serverUrl}</span>
                                <Copy className="w-3.5 h-3.5 text-zinc-700 group-hover/copy:text-zinc-100 transition-colors" />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.4em] ml-1">Identity_ID</label>
                            <div className="flex items-center justify-between group/copy cursor-pointer bg-black/40 px-6 py-5 rounded-2xl border border-white/5 hover:border-zinc-500 transition-all shadow-inner" onClick={() => copyToClipboard(username)}>
                                <span className="text-[10px] font-black text-zinc-100 truncate pr-4">{username}</span>
                                <Copy className="w-3.5 h-3.5 text-zinc-700 group-hover/copy:text-zinc-100 transition-colors" />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.4em] ml-1">Access_Token</label>
                            <div className="flex items-center justify-between group/copy cursor-pointer bg-black/40 px-6 py-5 rounded-2xl border border-white/5 hover:border-zinc-500 transition-all relative overflow-hidden shadow-inner" onClick={() => copyToClipboard(password)}>
                                <span className="text-[10px] font-black text-zinc-200 tracking-[0.5em] truncate">••••••••••••</span>
                                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover/copy:opacity-100 transition-opacity" />
                                <span className="text-[7px] font-black uppercase tracking-tighter text-zinc-950 bg-white px-3 py-2 rounded-lg opacity-0 group-hover/copy:opacity-100 transition-all absolute right-5 shadow-2xl">Copy</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Status bypassed for cleaner UI */}

                {copied && (
                    <div className="fixed bottom-10 right-10 bg-zinc-100 text-zinc-950 text-[9px] font-black uppercase tracking-widest px-8 py-4 rounded-2xl shadow-[0_20px_60px_rgba(255,255,255,0.1)] animate-in fade-in slide-in-from-bottom-4 border border-white/20">
                        Registry_Data_Buffered
                    </div>
                )}
            </div>
        </div>
    );
}
