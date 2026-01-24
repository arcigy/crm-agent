'use client'

import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  Loader2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Wifi,
  WifiOff,
  Activity
} from 'lucide-react'
import { useEffect } from 'react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkConnectivity = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) setServerStatus('online')
        else setServerStatus('offline')
      } catch (e) {
        setServerStatus('offline')
      }
    }
    checkConnectivity()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('The email or password you entered is incorrect.')
        } else {
          toast.error(error.message)
        }
      } else {
        toast.success('Access granted. Welcome back!')
        router.refresh()
        router.replace('/dashboard')
      }
    } catch (err: any) {
      console.error('Login error:', err)
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        toast.error('SERVER UNREACHABLE: The connection to Supabase timed out. Your project might be paused or there is a network restriction.')
      } else {
        toast.error('An unexpected error occurred. Please try again later.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] p-4 font-sans selection:bg-indigo-500/30">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-md space-y-8 relative">
        {/* Logo/Brand Area */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(79,70,229,0.3)] mb-4 rotate-3 hover:rotate-0 transition-transform duration-300">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white">The Black Box</h1>
          <p className="text-gray-400 font-medium">Elevate your CRM workflow</p>

          {/* Server Status Badge */}
          <div className={`mt-4 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 border transition-all duration-500 mx-auto w-fit ${serverStatus === 'online' ? 'bg-green-500/10 border-green-500/50 text-green-400' :
            serverStatus === 'offline' ? 'bg-red-500/10 border-red-500/50 text-red-400 animate-pulse' :
              'bg-gray-500/10 border-gray-500/50 text-gray-400'
            }`}>
            {serverStatus === 'online' ? <Wifi className="w-3 h-3" /> :
              serverStatus === 'offline' ? <WifiOff className="w-3 h-3" /> :
                <Activity className="w-3 h-3 animate-pulse" />}
            Backend Status: {serverStatus}
          </div>
        </div>

        {/* Card */}
        <div className="bg-[#141414]/80 backdrop-blur-xl border border-white/5 p-8 rounded-3xl shadow-2xl space-y-6">
          {serverStatus === 'offline' && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-3 text-red-400">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div className="text-xs space-y-1">
                <p className="font-bold">Database Server Unreachable</p>
                <p className="opacity-80 leading-relaxed">We can't connect to the core database. Please check if your Supabase project is active or "Paused" in the dashboard.</p>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Sign in</h2>
            <p className="text-sm text-gray-500">Welcome back. Please enter your details.</p>
          </div>

          <form className="space-y-4" onSubmit={handleLogin}>
            <div className="space-y-4">
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-500 transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-gray-600 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all text-sm"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-500 transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-12 text-white placeholder:text-gray-600 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all text-sm"
                  placeholder="Password"
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
            </div>

            <div className="flex items-center justify-end">
              <a href="/forgot-password" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Connect to Workspace
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 pt-4 border-t border-white/5">
            New to the platform?{' '}
            <a href="/register" className="font-bold text-white hover:text-indigo-400 transition-colors">
              Request access
            </a>
          </p>
        </div>

        {/* Footer info */}
        <div className="text-center">
          <p className="text-[10px] text-gray-600 uppercase tracking-[0.2em] font-black">
            Secure enterprise connection
          </p>
        </div>
      </div>
    </div>
  )
}
