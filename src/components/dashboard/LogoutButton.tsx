'use client'

import { signOut } from 'next-auth/react' // Use NextAuth signOut
import { LogOut } from 'lucide-react'

export function LogoutButton({ className }: { className?: string }) {
  const handleLogout = async () => {
    // NextAuth signout
    await signOut({ callbackUrl: '/login' });
  }

  const defaultClass = "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-auto";

  return (
    <button
      onClick={handleLogout}
      className={className || defaultClass}
    >
      <LogOut className="w-4 h-4" />
      <span>Odhlásiť sa</span>
    </button>
  )
}
