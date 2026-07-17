import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://useshelfready.com"),
  title: {
    default: "ShelfReady — make your store shoppable by AI agents",
    template: "%s · ShelfReady",
  },
  description:
    "Compliant product feeds for ChatGPT, Google and Perplexity, an agent-readiness audit with a fix-first list, Claude-powered catalog enrichment, and freshness monitoring — for stores that aren't on Shopify.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "ShelfReady",
    url: "https://useshelfready.com",
    title: "ShelfReady — make your store shoppable by AI agents",
    description:
      "Feeds, audits, enrichment and monitoring for AI shopping surfaces. Free instant agent-readiness scan.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ShelfReady — make your store shoppable by AI agents",
    description:
      "Feeds, audits, enrichment and monitoring for AI shopping surfaces. Free instant agent-readiness scan.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
