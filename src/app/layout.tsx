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

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    template: "%s | NetaInk",
    default: "NetaInk | Hold your representatives accountable"
  },
  description:
    "NetaInk is a mobile-first civic platform to file RTIs, turn photos into complaints, and see how MPs and MLAs rank across India, starting with Delhi.",
  openGraph: {
    type: "website",
    url: "https://neta.ink",
    title: "NetaInk | Hold your representatives accountable",
    description:
      "File RTIs, submit civic complaints, and track representative rankings across India. Delhi is live, more states coming soon.",
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
                    href="/"
                    className="rounded-full px-3 py-1 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-slate-50 transition-colors"
                  >
                    Home
                  </Link>
                  <Link
                    href="/complaints"
                    className="rounded-full px-3 py-1 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-slate-50 transition-colors"
                  >
                    Complaints
                  </Link>
                  <Link
                    href="/rti"
                    className="rounded-full px-3 py-1 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-slate-50 transition-colors"
                  >
                    RTI
                  </Link>
                  <Link
                    href="/rankings"
                    className="rounded-full px-3 py-1 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-slate-50 transition-colors"
                  >
                    Rankings
                  </Link>
                  <Link
                    href="/volunteer"
                    className="rounded-full px-3 py-1 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-100 transition-colors"
                  >
                    Volunteer
                  </Link>
                  <Link
                    href="/compare"
                    className="rounded-full px-3 py-1 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-slate-50 transition-colors"
                  >
                    Compare
                  </Link>
                  <Link
                    href="/politicians"
                    className="hidden rounded-full px-3 py-1 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-slate-50 transition-colors sm:inline-flex"
                  >
                    Politicians
                  </Link>
                  <Link
                    href="/about"
                    className="hidden rounded-full px-3 py-1 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-slate-50 transition-colors sm:inline-flex"
                  >
                    About
                  </Link>
                  <Link
                    href="/faq"
                    className="hidden rounded-full px-3 py-1 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-slate-50 transition-colors sm:inline-flex"
                  >
                    FAQ
                  </Link>
                </nav>
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
          <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 transition-colors duration-300">
            <div className="mx-auto flex max-w-5xl flex-col items-start gap-3 px-4 py-4 text-xs text-slate-500 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between transition-colors">
              <div className="flex flex-wrap gap-3">
                <Link href="/about" className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
                  About
                </Link>
                <Link href="/faq" className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
                  FAQ
                </Link>
                <Link href="/terms" className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
                  Terms
                </Link>
                <Link href="/privacy" className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
                  Privacy
                </Link>
              </div>
              <p className="text-[11px] text-slate-500">
                © {new Date().getFullYear()} neta. Built for citizens of India.
              </p>
            </div>
          </footer>
          <ChatbotWrapper />
          <MobileBottomNav />
          <PwaRegister />
          <DevOverlay />
        </ThemeProvider>
      </body>
    </html>
  );
}
