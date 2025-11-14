import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/lib/query/provider";

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
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
