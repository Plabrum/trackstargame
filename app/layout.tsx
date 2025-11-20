import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/lib/query/provider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Trackstar Game",
  description: "Name the artist, win $5 *(no actual money involved)",
  icons: {
    icon: '/favicon.svg',
  },
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
            <footer className="py-4 text-center text-sm text-muted-foreground">
              Made by Phil Labrum © 2025
            </footer>
          </div>
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  );
}
