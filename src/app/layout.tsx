import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from 'sonner';
import "./globals.css";
import { ClerkProvider } from '@clerk/nextjs'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CRM Agent",
  description: "Advanced Agentic CRM",
};

import { VoiceDictationProvider } from '@/components/VoiceDictationProvider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="sk">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <VoiceDictationProvider>
            {children}
            <Toaster richColors position="top-right" />
          </VoiceDictationProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
