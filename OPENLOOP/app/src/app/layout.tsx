import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenLoop — The Open AI Economy",
  description: "Your Loop. Your economy. Get your time back. Loop handles bills, refunds, scheduling, and deals — free. Get your Loop.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
