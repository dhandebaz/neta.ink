import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/PwaRegister";
import { DevOverlay } from "@/components/DevOverlay";
import { CurrentUserProvider } from "@/components/CurrentUserProvider";

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
    <html lang="en">
      <body className={`${inter.className} bg-slate-950 text-slate-50`}>
        <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/70 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 gap-4">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full bg-slate-900/80 px-3 py-1 text-sm font-semibold tracking-tight text-slate-50 ring-1 ring-slate-700 hover:bg-slate-900"
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-slate-950">
                  n
                </span>
                <span>neta</span>
              </Link>
              <nav className="hidden items-center gap-2 text-xs sm:flex sm:text-sm">
                <Link
                  href="/"
                  className="rounded-full px-3 py-1 text-slate-200 hover:bg-slate-800 hover:text-slate-50"
                >
                  Home
                </Link>
                <Link
                  href="/complaints"
                  className="rounded-full px-3 py-1 text-slate-200 hover:bg-slate-800 hover:text-slate-50"
                >
                  Complaints
                </Link>
                <Link
                  href="/rti"
                  className="rounded-full px-3 py-1 text-slate-200 hover:bg-slate-800 hover:text-slate-50"
                >
                  RTI
                </Link>
                <Link
                  href="/rankings/delhi"
                  className="rounded-full px-3 py-1 text-slate-200 hover:bg-slate-800 hover:text-slate-50"
                >
                  Rankings
                </Link>
                <Link
                  href="/compare"
                  className="rounded-full px-3 py-1 text-slate-200 hover:bg-slate-800 hover:text-slate-50"
                >
                  Compare
                </Link>
                <Link
                  href="/politicians"
                  className="hidden rounded-full px-3 py-1 text-slate-200 hover:bg-slate-800 hover:text-slate-50 sm:inline-flex"
                >
                  Politicians
                </Link>
                <Link
                  href="/about"
                  className="hidden rounded-full px-3 py-1 text-slate-200 hover:bg-slate-800 hover:text-slate-50 sm:inline-flex"
                >
                  About
                </Link>
                <Link
                  href="/faq"
                  className="hidden rounded-full px-3 py-1 text-slate-200 hover:bg-slate-800 hover:text-slate-50 sm:inline-flex"
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
        <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900">
          <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-6 lg:py-8">
            {props.children}
          </div>
        </main>
        <footer className="border-t border-slate-800 bg-slate-950">
          <div className="mx-auto flex max-w-5xl flex-col items-start gap-3 px-4 py-4 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-3">
              <Link href="/about" className="hover:text-slate-200">
                About
              </Link>
              <Link href="/faq" className="hover:text-slate-200">
                FAQ
              </Link>
              <Link href="/terms" className="hover:text-slate-200">
                Terms
              </Link>
              <Link href="/privacy" className="hover:text-slate-200">
                Privacy
              </Link>
            </div>
            <p className="text-[11px] text-slate-500">
              © {new Date().getFullYear()} neta. Built for citizens of India.
            </p>
          </div>
        </footer>
        <PwaRegister />
        <DevOverlay />
      </body>
    </html>
  );
}
