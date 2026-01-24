'use client'

import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import {
    Loader2,
    Lock,
    ShieldCheck,
    Eye,
    EyeOff,
    CheckCircle2
} from 'lucide-react'

export default function UpdatePasswordPage() {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [success, setSuccess] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()

        if (password !== confirmPassword) {
            toast.error('Passwords do not match')
            return
        }

        if (password.length < 6) {
            toast.error('Password must be at least 6 characters')
            return
        }

        setLoading(true)

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            })

            if (error) {
                if (error.message === 'Failed to fetch') {
                    toast.error('Network connection failed. Please check your internet.')
                } else {
                    toast.error(error.message)
                }
            } else {
                setSuccess(true)
                toast.success('Password updated successfully!')
                setTimeout(() => {
                    router.replace('/login')
                }, 2000)
            }
        } catch (err: any) {
            console.error('Update error:', err)
            toast.error('Could not update password.')
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
                        <Lock className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-white">Security Update</h1>
                </div>

                <div className="bg-[#141414]/80 backdrop-blur-xl border border-white/5 p-8 rounded-3xl shadow-2xl space-y-6">
                    {success ? (
                        <div className="text-center space-y-6 py-4">
                            <div className="flex justify-center">
                                <CheckCircle2 className="w-16 h-16 text-green-500 animate-pulse" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold text-white">Success!</h2>
                                <p className="text-sm text-gray-500">
                                    Your password has been updated. Redirecting you to login...
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold text-white">New password</h2>
                                <p className="text-sm text-gray-500">Set a secure password for your account.</p>
                            </div>

                            <form className="space-y-4" onSubmit={handleUpdate}>
                                <div className="space-y-4">
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-500 transition-colors">
                                            <Lock className="w-5 h-5" />
                                        </div>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            required
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-12 text-white placeholder:text-gray-600 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all text-sm"
                                            placeholder="New password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>

                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-500 transition-colors">
                                            <Lock className="w-5 h-5" />
                                        </div>
                                        <input
                                            type="password"
                                            required
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-gray-600 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all text-sm"
                                            placeholder="Confirm new password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex gap-3">
                                    <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0" />
                                    <p className="text-[11px] text-gray-400 leading-relaxed font-medium">
                                        Your password should be at least 6 characters long and include a mix of numbers and symbols for better security.
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                                >
                                    {loading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        "Update Security Credentials"
                                    )}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
