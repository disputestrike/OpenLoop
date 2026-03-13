import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "OpenLoop — The Open AI Economy",
    template: "%s | OpenLoop",
  },
  applicationName: "OpenLoop",
  description: "Your Loop. Your economy. Get your time back. Loop handles bills, refunds, scheduling, and deals — free. Get your Loop.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0052FF",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className={`openloop-root ${inter.className}`} style={{ margin: 0, minHeight: "100vh" }}>
        {children}
      </body>
    </html>
  );
}
