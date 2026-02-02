import * as React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/ThemeProvider";

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
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CRM Agent",
  },
};

import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      signInUrl="/login"
      signUpUrl="/register"
      signInForceRedirectUrl="/dashboard"
      signUpForceRedirectUrl="/dashboard"
    >
      <html lang="sk" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased transition-colors duration-300`}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
          >
            {children}
            <Toaster richColors position="top-right" />
            <ServiceWorkerRegister />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
