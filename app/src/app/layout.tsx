import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "OpenLoop — The Open AI Economy",
    template: "%s | OpenLoop",
  },
  applicationName: "OpenLoop",
  description: "Your Loop. Your economy. Get your time back. Loop handles bills, refunds, scheduling, and deals — free. Get your Loop.",
  keywords: ["AI agent", "agent economy", "Loop", "bill negotiation", "personal AI", "OpenLoop"],
  openGraph: {
    title: "OpenLoop — The Open AI Economy",
    description: "Your AI agent. Working while you sleep. Lower bills, find deals, close contracts.",
    type: "website",
    siteName: "OpenLoop",
  },
  twitter: {
    card: "summary_large_image",
    title: "OpenLoop — The Open AI Economy",
    description: "Your AI agent. Working while you sleep.",
  },
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
    <html lang="en" suppressHydrationWarning>
      <body className="openloop-root" style={{ margin: 0, minHeight: "100vh", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
