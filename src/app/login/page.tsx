'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { checkEmailStatus, loginUser, completeOnboarding } from '@/app/actions/auth';
import { Loader2, ArrowRight, Check, AlertCircle, Lock } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
    const router = useRouter();
    const [step, setStep] = useState<'EMAIL' | 'PASSWORD' | 'ONBOARDING' | 'DENIED'>('EMAIL');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [userName, setUserName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await checkEmailStatus(email);
            if (res.status === 'ACTIVE') {
                setUserName(res.name || '');
                setStep('PASSWORD');
            } else if (res.status === 'FIRST_TIME') {
                setUserName(res.name || '');
                setStep('ONBOARDING');
            } else if (res.status === 'UNKNOWN' || res.status === 'SUSPENDED') {
                setStep('DENIED');
            } else {
                toast.error('Systémová chyba. Skúste neskôr.');
            }
        } catch (error) {
            toast.error('Chyba komunikácie.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const res = await loginUser(email, password);
        if (res.success) {
            router.push('/dashboard');
        } else {
            toast.error(res.error || 'Nesprávne heslo');
            setLoading(false);
        }
    };

    const handleOnboarding = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 6) {
            toast.error('Heslo musí mať aspoň 6 znakov');
            return;
        }
        setLoading(true);
        const res = await completeOnboarding(email, password);
        if (res.success) {
            toast.success('Účet aktivovaný! Vitajte.');
            router.push('/dashboard');
        } else {
            toast.error(res.error || 'Chyba pri aktivácii');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden">
                <div className="p-8 md:p-12">
                    <div className="flex justify-center mb-8">
                        <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center">
                            <span className="text-white text-2xl font-black tracking-tighter">RCG</span>
                        </div>
                    </div>

                    {step === 'EMAIL' && (
                        <form onSubmit={handleEmailSubmit} className="space-y-6 animate-in fade-in slide-in-from-right duration-300">
                            <div className="text-center">
                                <h1 className="text-2xl font-black text-gray-900 mb-2">Prihlásenie</h1>
                                <p className="text-gray-500 text-sm">Zadajte svoj pracovný email pre pokračovanie</p>
                            </div>
                            <div>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@company.com"
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                                    autoFocus
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-black text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-gray-900 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Pokračovať <ArrowRight className="w-4 h-4" /></>}
                            </button>
                        </form>
                    )}

                    {step === 'PASSWORD' && (
                        <form onSubmit={handleLogin} className="space-y-6 animate-in fade-in slide-in-from-right duration-300">
                            <div className="text-center">
                                <h1 className="text-xl font-bold text-gray-900 mb-1">Vitajte späť, {userName}</h1>
                                <p className="text-gray-400 text-xs uppercase tracking-widest">{email}</p>
                            </div>
                            <div>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5" />
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Vaše heslo"
                                        className="w-full pl-12 pr-5 py-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-black text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-gray-900 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Prihlásiť sa"}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setStep('EMAIL'); setPassword(''); }}
                                className="w-full text-center text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                ← Zmeniť email
                            </button>
                        </form>
                    )}

                    {step === 'ONBOARDING' && (
                        <form onSubmit={handleOnboarding} className="space-y-6 animate-in fade-in slide-in-from-right duration-300">
                            <div className="text-center">
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-600 mb-4">
                                    <Check className="w-6 h-6" />
                                </div>
                                <h1 className="text-xl font-bold text-gray-900 mb-2">Aktivácia účtu</h1>
                                <p className="text-gray-500 text-sm">nastavte si bezpečné heslo pre prístup</p>
                            </div>
                            <div>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Nové heslo (min. 6 znakov)"
                                    minLength={6}
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                                    autoFocus
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-green-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Aktivovať a Vstúpiť"}
                            </button>
                        </form>
                    )}

                    {step === 'DENIED' && (
                        <div className="text-center space-y-6 animate-in zoom-in duration-300">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 text-red-500">
                                <AlertCircle className="w-8 h-8" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 mb-2">Prístup zamietnutý</h2>
                                <p className="text-gray-500 text-sm max-w-[200px] mx-auto">
                                    Email <strong>{email}</strong> nie je v systéme autorizovaný.
                                </p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-xl text-xs text-gray-600">
                                Pre prístup kontaktujte administrátora na<br />
                                <a href="https://arcigy.com" className="text-black font-bold hover:underline">arcigy.com</a>
                            </div>
                            <button
                                onClick={() => { setStep('EMAIL'); setEmail(''); }}
                                className="text-xs font-bold text-gray-400 hover:text-gray-600"
                            >
                                ← Skúsiť iný email
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center text-gray-400 text-xs font-medium">
                &copy; {new Date().getFullYear()} RCG CRM Agent. Secure System.
            </div>
        </div>
    );
}
