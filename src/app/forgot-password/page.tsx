'use client'

import { createClient } from '@/lib/supabase-browser'
import { useState } from 'react'
import { toast } from 'sonner'
import {
    Loader2,
    Mail,
    ArrowLeft,
    KeyRound,
    CheckCircle2
} from 'lucide-react'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const supabase = createClient()

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${location.origin}/auth/callback?next=/update-password`,
            })

            if (error) {
                if (error.message === 'Failed to fetch') {
                    toast.error('Network connection failed. Please check your internet.')
                } else {
                    toast.error(error.message)
                }
            } else {
                setSubmitted(true)
                toast.success('Reset link sent! Please check your inbox.')
            }
        } catch (err: any) {
            console.error('Reset error:', err)
            toast.error('Could not send reset link.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] p-4 font-sans">
            {/* Background Orbs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]"></div>
            </div>

            <div className="w-full max-w-md space-y-8 relative">
                <div className="flex flex-col items-center text-center space-y-2">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(79,70,229,0.3)] mb-4 rotate-3">
                        <KeyRound className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-white">Password Recovery</h1>
                </div>

                <div className="bg-[#141414]/80 backdrop-blur-xl border border-white/5 p-8 rounded-3xl shadow-2xl space-y-6">
                    {submitted ? (
                        <div className="text-center space-y-6 py-4">
                            <div className="flex justify-center">
                                <CheckCircle2 className="w-16 h-16 text-green-500 animate-bounce" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold text-white">Check your email</h2>
                                <p className="text-sm text-gray-500">
                                    We've sent a password reset link to <span className="text-white font-medium">{email}</span>.
                                </p>
                            </div>
                            <a href="/login" className="inline-flex items-center gap-2 text-sm font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
                                <ArrowLeft className="w-4 h-4" /> Back to sign in
                            </a>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold text-white">Forgot password?</h2>
                                <p className="text-sm text-gray-500">No worries, we'll send you reset instructions.</p>
                            </div>

                            <form className="space-y-4" onSubmit={handleReset}>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-500 transition-colors">
                                        <Mail className="w-5 h-5" />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-gray-600 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all text-sm"
                                        placeholder="Enter your email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                                >
                                    {loading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        "Reset Password"
                                    )}
                                </button>
                            </form>

                            <p className="text-center text-sm pt-4 border-t border-white/5">
                                <a href="/login" className="inline-flex items-center gap-2 font-bold text-white hover:text-indigo-400 transition-colors">
                                    <ArrowLeft className="w-4 h-4" /> Back to sign in
                                </a>
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
