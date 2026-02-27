import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/PwaRegister";
import { DevOverlay } from "@/components/DevOverlay";
import { CurrentUserProvider } from "@/components/CurrentUserProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import LogoToggle from "@/components/LogoToggle";
import { ChatbotWrapper } from "@/components/ChatbotWrapper";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import GlobalSearchClient from "@/components/GlobalSearchClient";
import { Analytics } from "@vercel/analytics/react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    template: "%s | Neta.ink",
    default: "Neta.ink | Hold your representatives accountable."
  },
  description:
    "AI-powered civic transparency platform. Track politician criminal records, file complaints, and draft RTIs.",
  openGraph: {
    type: "website",
    url: "https://neta.ink",
    title: "Neta.ink | Hold your representatives accountable.",
    description:
      "AI-powered civic transparency platform. Track politician criminal records, file complaints, and draft RTIs.",
    images: ["/og-default.jpg"]
  },
  twitter: {
    card: "summary_large_image",
    title: "Neta.ink | Hold your representatives accountable.",
    description:
      "AI-powered civic transparency platform. Track politician criminal records, file complaints, and draft RTIs.",
    images: ["/og-default.jpg"]
  },
  metadataBase: new URL("https://neta.ink"),
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }]
  }
};

export const viewport: Viewport = {
  themeColor: "#fbbf24"
};

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50 transition-colors duration-300`}>
        <ThemeProvider>
          <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/70 dark:border-slate-800 dark:bg-slate-950/70 backdrop-blur transition-colors duration-300">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 gap-4">
              <div className="flex items-center gap-4">
                <LogoToggle />
                <nav className="hidden items-center gap-2 text-xs sm:flex sm:text-sm">
                  <Link
                    href="/rankings"
                    className="rounded-full px-3 py-1 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-slate-50 transition-colors"
                  >
                    Rankings
                  </Link>
                  <Link
                    href="/politicians"
                    className="rounded-full px-3 py-1 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-slate-50 transition-colors"
                  >
                    Politicians
                  </Link>
                  <Link
                    href="/tools"
                    className="rounded-full px-3 py-1 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-slate-50 transition-colors"
                  >
                    Civic Store
                  </Link>
                </nav>
                <div className="hidden md:block">
                  <GlobalSearchClient />
                </div>
              </div>
              <div className="flex items-center justify-end">
                <CurrentUserProvider />
              </div>
            </div>
          </header>
          <main className="min-h-screen bg-slate-50 dark:bg-gradient-to-b dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 transition-colors duration-300 pb-20 sm:pb-0">
            <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-6 lg:py-8">
              {props.children}
            </div>
          </main>
          <footer className="mt-20 border-t border-slate-200 bg-white py-12 dark:border-slate-800 dark:bg-slate-950">
            <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 px-4 text-sm text-slate-500 sm:flex-row">
              <p>© {new Date().getFullYear()} Neta.ink. Hold them accountable.</p>
              <div className="flex gap-6">
                <Link href="/about" className="hover:text-slate-900 dark:hover:text-white">
                  About
                </Link>
                <Link href="/faq" className="hover:text-slate-900 dark:hover:text-white">
                  FAQ
                </Link>
                <Link href="/terms" className="hover:text-slate-900 dark:hover:text-white">
                  Terms
                </Link>
                <Link href="/privacy" className="hover:text-slate-900 dark:hover:text-white">
                  Privacy
                </Link>
              </div>
            </div>
          </footer>
          <ChatbotWrapper />
          <MobileBottomNav />
          <PwaRegister />
          <DevOverlay />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
