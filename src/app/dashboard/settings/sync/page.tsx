'use client';

import * as React from 'react';
import { Smartphone, Copy, Apple, ArrowRight, Cloud, X, ShieldCheck, Zap } from 'lucide-react';
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
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen bg-[#060608] text-white p-6 lg:p-10 relative overflow-hidden">
            {/* Optimized Background Glows - Pure CRM Violet Bubbles */}
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-violet-600/20 rounded-full blur-[120px] animate-pulse pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('/grid.svg')] opacity-[0.02] pointer-events-none" />

            <div className="max-w-6xl mx-auto space-y-8 relative z-10">
                {/* Compact Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="px-3 py-1 bg-violet-500/10 border border-violet-500/30 rounded-full shadow-[0_0_15px_rgba(139,92,246,0.1)]">
                                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-violet-400">SYNC_HUB_v2.1</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-1 h-1 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.8)] animate-pulse" />
                                <span className="text-[9px] font-black text-white/30 uppercase tracking-widest whitespace-nowrap">System_Ready</span>
                            </div>
                        </div>
                        <h1 className="text-3xl lg:text-4xl font-[900] uppercase italic tracking-tighter mb-2 text-white">Connect</h1>
                        <p className="text-white/30 font-bold uppercase tracking-widest text-[9px] max-w-sm leading-relaxed">
                            Bezpečné prepojenie vašich mobilných zariadení a cloudu s centrálnym CRM systémom.
                        </p>
                    </div>
                    <Link href="/dashboard/contacts">
                        <button className="group relative w-10 h-10 flex items-center justify-center transition-all shrink-0">
                            <div className="absolute inset-0 bg-white/5 border border-white/10 rounded-lg group-hover:bg-white group-hover:rotate-90 transition-all duration-500" />
                            <X className="w-5 h-5 text-white group-hover:text-black relative z-10 transition-transform duration-500" />
                        </button>
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {/* Compact Card: iOS */}
                    <div className="group relative bg-[#0a0a0c]/80 backdrop-blur-3xl rounded-[1.5rem] p-6 border border-white/5 hover:border-violet-500/40 transition-all duration-500 overflow-hidden shadow-xl">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-violet-600/10 rounded-full blur-xl -mr-10 -mt-10 group-hover:bg-violet-600/20 transition-all" />
                        
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-violet-500/10 transition-colors">
                                <Apple className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-base font-[900] uppercase italic tracking-tight text-white">Apple iOS</h2>
                                <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] mt-0.5">Native Protocol</p>
                            </div>
                        </div>

                        <div className="flex flex-col items-center justify-center py-2">
                            <div className="p-1 bg-white rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.02)] group-hover:shadow-[0_0_40px_rgba(139,92,246,0.1)] transition-all">
                                <div className="p-3 bg-white rounded-xl">
                                    {origin && <QRCodeSVG value={`${origin}/mobile-setup`} size={120} bgColor="#ffffff" fgColor="#000000" />}
                                </div>
                            </div>
                            <div className="mt-6 flex items-center gap-2 px-3 py-1.5 bg-violet-500/5 border border-violet-500/10 rounded-lg">
                                <Zap className="w-2.5 h-2.5 text-violet-400" />
                                <span className="text-[8px] font-black uppercase tracking-widest text-violet-400/60 leading-none">Safari scan recommended</span>
                            </div>
                        </div>
                    </div>

                    {/* Compact Card: Android */}
                    <div className="group relative bg-[#0a0a0c]/80 backdrop-blur-3xl rounded-[1.5rem] p-6 border border-white/5 hover:border-violet-500/40 transition-all duration-500 overflow-hidden shadow-xl">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-violet-600/10 rounded-full blur-xl -mr-10 -mt-10 group-hover:bg-violet-600/20 transition-all" />
                        
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-violet-500/10 transition-colors">
                                <Smartphone className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-base font-[900] uppercase italic tracking-tight text-white">Android</h2>
                                <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] mt-0.5">DAVx5 Sync</p>
                            </div>
                        </div>

                        <div className="flex flex-col items-center justify-center py-2">
                            <div className="p-1 bg-white rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.02)] group-hover:shadow-[0_0_40px_rgba(139,92,246,0.1)] transition-all">
                                <div className="p-3 bg-white rounded-xl">
                                    <QRCodeSVG value={serverUrl} size={120} bgColor="#ffffff" fgColor="#000000" />
                                </div>
                            </div>
                            <div className="mt-6 group/store cursor-pointer flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg hover:border-violet-500/40 hover:bg-violet-500/10 transition-all">
                                <span className="text-[8px] font-black uppercase tracking-widest leading-none text-white/40 group-hover/store:text-violet-400">Open Play Store</span>
                                <ArrowRight className="w-2.5 h-2.5 text-white/20 group-hover/store:text-violet-400" />
                            </div>
                        </div>
                    </div>

                    {/* Compact Card: Google */}
                    <div className="group relative bg-[#0a0a0c]/80 backdrop-blur-3xl rounded-[1.5rem] p-6 border border-white/5 hover:border-violet-500/40 transition-all duration-500 overflow-hidden shadow-xl">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-violet-600/10 rounded-full blur-xl -mr-10 -mt-10 group-hover:bg-violet-600/20 transition-all" />
                        
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-violet-500/10 transition-colors">
                                <Cloud className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-base font-[900] uppercase italic tracking-tight text-white">Google Cloud</h2>
                                <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] mt-0.5">Workspace Sync</p>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col justify-center gap-4 py-4 px-2">
                             <p className="text-[9px] font-bold text-white/20 italic leading-relaxed uppercase tracking-wider text-center">
                                Pokročilá integrácia kalendára a emailov s AI analýzou.
                            </p>
                            <div className="relative group/btn p-[1px] bg-white/10 rounded-xl hover:bg-violet-500/50 transition-all">
                                <GoogleConnectButton className="w-full h-10 bg-[#0a0a0c] hover:bg-transparent rounded-[0.65rem] font-black uppercase tracking-widest text-[8px] transition-all" showManageOptions={true} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Compact Details Section */}
                <div className="bg-[#0a0a0c]/60 backdrop-blur-3xl rounded-[2rem] p-8 border border-white/5 relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />
                    
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-7 h-7 rounded-lg bg-violet-600/10 border border-violet-500/20 flex items-center justify-center">
                            <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
                        </div>
                        <h3 className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30 italic">Secure_Credentials</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-[7.5px] font-black text-white/10 uppercase tracking-[0.2em]">Server_Endpoint</label>
                            <div className="flex items-center justify-between group/copy cursor-pointer bg-white/[0.01] px-4 py-3 rounded-xl border border-white/5 hover:border-violet-500/30 transition-all" onClick={() => copyToClipboard(serverUrl)}>
                                <code className="text-[9px] font-mono text-violet-300/80 truncate">{serverUrl}</code>
                                <Copy className="w-3 h-3 text-white/5 group-hover/copy:text-violet-400" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[7.5px] font-black text-white/10 uppercase tracking-[0.2em]">Auth_Identity</label>
                            <div className="flex items-center justify-between group/copy cursor-pointer bg-white/[0.01] px-4 py-3 rounded-xl border border-white/5 hover:border-violet-500/30 transition-all" onClick={() => copyToClipboard(username)}>
                                <code className="text-[9px] font-mono text-white/60 truncate">{username}</code>
                                <Copy className="w-3 h-3 text-white/5 group-hover/copy:text-violet-400" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[7.5px] font-black text-white/10 uppercase tracking-[0.2em]">Security_Token</label>
                            <div className="flex items-center justify-between group/copy cursor-pointer bg-white/[0.01] px-4 py-3 rounded-xl border border-white/5 hover:border-violet-500/30 transition-all relative overflow-hidden" onClick={() => copyToClipboard(password)}>
                                <code className="text-[9px] font-mono text-violet-400 tracking-[0.4em] truncate">••••••••••••</code>
                                <span className="text-[7px] font-black uppercase tracking-tighter text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded border border-violet-500/20 group-hover/copy:bg-violet-500 group-hover/copy:text-black transition-all">Copy</span>
                            </div>
                        </div>
                    </div>

                    {copied && (
                        <div className="absolute bottom-6 right-10 bg-violet-500 text-black text-[8px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-[0_0_15px_rgba(139,92,246,0.3)] animate-in fade-in zoom-in-95">
                            Status: Copied
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
