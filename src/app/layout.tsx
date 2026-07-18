import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
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

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1b17" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const umamiId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  const umamiSrc =
    process.env.NEXT_PUBLIC_UMAMI_URL ??
    "https://analytics.useshelfready.com/script.js";
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} bg-background`}
    >
      <body className="font-sans antialiased" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        {umamiId && (
          <Script defer src={umamiSrc} data-website-id={umamiId} strategy="afterInteractive" />
        )}
      </body>
    </html>
  );
}
