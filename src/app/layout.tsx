import * as React from "react";
import type { Metadata } from "next";
import { Outfit, Playfair_Display } from "next/font/google"; // Outfit for UI, Playfair for headlines

import { Toaster } from "sonner";
import "./globals.css";
import { SafeClerkProvider } from "@/components/SafeClerkProvider";
import { ThemeProvider } from "@/components/ThemeProvider";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-sans" });
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
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
    <SafeClerkProvider>
      <html lang="sk" suppressHydrationWarning>
        <body
          className={`${outfit.variable} ${playfair.variable} font-sans antialiased transition-colors duration-300`}
          suppressHydrationWarning
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
    </SafeClerkProvider>
  );
}
