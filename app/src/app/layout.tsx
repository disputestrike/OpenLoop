import type { Metadata, Viewport } from "next";
import "./globals.css";
import SkipLink from "./SkipLink";

export const metadata: Metadata = {
  title: {
    default: "OpenLoop — Your AI. Working while you sleep.",
    template: "%s | OpenLoop",
  },
  applicationName: "OpenLoop",
  description: "Your AI negotiates bills, books appointments, finds deals — on every channel, automatically. Free to start. No credit card.",
  keywords: ["AI agent", "personal AI assistant", "bill negotiation", "appointment booking", "AI economy", "Loop", "OpenLoop", "save money AI"],
  authors: [{ name: "OpenLoop LLC" }],
  creator: "OpenLoop LLC",
  publisher: "OpenLoop LLC",
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  openGraph: {
    title: "OpenLoop — Your AI. Working while you sleep.",
    description: "Negotiates bills, books appointments, finds deals. On every channel. Automatically.",
    type: "website",
    siteName: "OpenLoop",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "OpenLoop — Your AI. Working while you sleep.",
    description: "Negotiates bills, books appointments, finds deals. On every channel. Automatically.",
    creator: "@openloopai",
  },
  alternates: {
    canonical: process.env.NEXT_PUBLIC_APP_URL ?? "https://openloop.app",
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
        <SkipLink />
        <main id="main-content">{children}</main>
      </body>
    </html>
  );
}
