'use client';

import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden flex justify-center">
                <SignIn
                    appearance={{
                        elements: {
                            formButtonPrimary: 'bg-black hover:bg-gray-900 transition-all text-sm uppercase tracking-widest font-bold py-3',
                            card: 'shadow-none border-none p-8',
                            headerTitle: 'text-2xl font-black text-gray-900',
                            headerSubtitle: 'text-gray-500 text-sm',
                        }
                    }}
                    fallbackRedirectUrl="/dashboard"
                />
            </div>

            <div className="mt-8 text-center text-gray-400 text-xs font-medium">
                &copy; {new Date().getFullYear()} RCG CRM Agent. Secure System.
            </div>
        </div>
    );
}
