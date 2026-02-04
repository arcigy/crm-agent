import * as React from "react";
import type { Metadata } from "next";
import { Outfit } from "next/font/google"; // Outfit gives a premium, modern, high-end feel

import { Toaster } from "sonner";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/ThemeProvider";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-sans" });

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
          className={`${outfit.variable} font-sans antialiased transition-colors duration-300`}
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
