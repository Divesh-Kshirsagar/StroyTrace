import type { Metadata } from "next";
import React from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { AuthProvider } from "@/features/auth/hooks/useAuth";
import SessionExpiredModal from "@/features/auth/components/SessionExpiredModal";
import Analytics from '@/shared/components/Analytics';
import Navbar from '@/shared/components/Navbar';
import '@/shared/lib/apiClient';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Clarity",
  description: "Clarity Network",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <React.Suspense fallback={null}>
          <Analytics />
        </React.Suspense>
        <AuthProvider>
          <Navbar />
          {children}
          <SessionExpiredModal />
        </AuthProvider>
      </body>
    </html>
  );
}
