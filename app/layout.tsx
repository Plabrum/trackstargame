import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/lib/query/provider";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Trackstar - Music Guessing Game",
  description: "A multiplayer music guessing game with buzz-in mechanics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryProvider>
          <div className="min-h-screen flex flex-col">
            <main className="flex-1">
              {children}
            </main>
            <footer className="py-4 text-center text-sm text-muted-foreground border-t">
              Made by Phil Labrum © 2025
            </footer>
          </div>
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  );
}
