import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/db/client";
import { states } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { getUserOrDefaultState } from "@/lib/states";
import { HomeStateSearchClient } from "./HomeStateSearchClient";

export const metadata: Metadata = {
  title: "neta – RTIs, complaints, and rankings for India",
  description:
    "neta helps citizens across India file RTIs, document civic complaints, and see how MPs and MLAs rank – starting with Delhi.",
  openGraph: {
    type: "website",
    url: "https://neta.ink",
    title: "neta – RTIs, complaints, and rankings for India",
    description:
      "Hold your neta accountable with RTIs, civic complaints, and representative rankings across India. Phase 1 is live in Delhi.",
    images: ["/og-default.jpg"]
  },
  alternates: {
    canonical: "https://neta.ink"
  }
};

export default async function HomePage() {
  let delhiReady = false;
  let delhiStatusMessage: string | null = null;
  let liveStateCodes: string[] = [];
  let initialStateCode = "DL";

  try {
    const rows = await db.select().from(states);

    const delhi = rows.find((row) => row.code === "DL") ?? null;
    const ingestionStatus = delhi?.ingestion_status ?? "missing";
    const delhiEnabled = delhi?.is_enabled ?? false;
    delhiReady = delhiEnabled && ingestionStatus === "ready";

    liveStateCodes = rows
      .filter((row) => row.is_enabled && row.ingestion_status === "ready")
      .map((row) => row.code);

    if (!delhi) {
      delhiStatusMessage =
        "Delhi is not ready yet. We are still setting things up.";
    } else if (ingestionStatus === "idle") {
      delhiStatusMessage =
        "Delhi setup is in progress and will be available here soon.";
    } else if (ingestionStatus === "ingesting") {
      delhiStatusMessage = "Delhi data is currently being prepared.";
    } else if (ingestionStatus === "error") {
      delhiStatusMessage =
        "Delhi data could not be loaded right now. Please try again later.";
    }
  } catch (error) {
    console.error("Error loading Delhi state for home page", error);
    delhiStatusMessage =
      "Delhi status is temporarily unavailable. Please try again in a bit.";
  }

  try {
    const currentUser = await getCurrentUser();

    if (currentUser) {
      const userState = await getUserOrDefaultState({
        state_code: currentUser.state_code
      });
      initialStateCode = userState.code;
    }
  } catch (error) {
    console.error("Error loading user state for home page", error);
  }

  const devAdminId = process.env.NEXT_PUBLIC_DEV_ADMIN_ID;
  const showAdminLink = process.env.NODE_ENV !== "production" && !!devAdminId;

  const webAppJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "neta",
    url: "https://neta.ink",
    description:
      "neta helps citizens across India file RTIs, document civic complaints, and see how MPs and MLAs rank – starting with Delhi.",
    applicationCategory: "GovernmentService",
    areaServed: {
      "@type": "Country",
      name: "India"
    }
  };

  return (
    <>
      <section className="pt-6 sm:pt-8">
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4 py-6 shadow-sm dark:border-slate-800 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 dark:shadow-none sm:px-6 sm:py-7 transition-colors duration-300">
          <div className="pointer-events-none absolute -left-24 -top-24 h-48 w-48 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-10 bottom-0 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="relative space-y-5">
            <p className="inline-flex items-center rounded-full bg-slate-100/80 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-amber-600 ring-1 ring-amber-500/40 dark:bg-slate-900/80 dark:text-amber-300 dark:ring-amber-400/40 transition-colors">
              India-wide in design · Live in Delhi
            </p>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl transition-colors">
                Hold your neta accountable.
              </h1>
              <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300 sm:text-base transition-colors">
                File RTIs, turn photos into civic complaints, and see how MPs and MLAs rank. Built
                for India, wired end-to-end for Delhi first.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="#state-search"
                className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-amber-400 px-4 text-sm font-medium text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-300 transition-colors"
              >
                Find your representative
              </a>
              <Link
                href="/complaints"
                className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-emerald-400 px-4 text-sm font-medium text-emerald-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-300 transition-colors"
              >
                File a complaint
              </Link>
              <Link
                href="/rti"
                className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-slate-300 bg-white/80 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-amber-400 hover:text-amber-700 dark:border-slate-600 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:border-amber-400 dark:hover:text-amber-200 transition-colors"
              >
                Draft an RTI
              </Link>
            </div>

            <div className="grid gap-3 text-xs text-slate-500 dark:text-slate-400 sm:grid-cols-3 transition-colors">
              <div className="rounded-xl border border-slate-200/80 bg-white/80 p-3 dark:border-slate-800/80 dark:bg-slate-950/80 transition-colors">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-300 transition-colors">
                  Delhi live
                </div>
                <p className="text-[13px] text-slate-600 dark:text-slate-300 transition-colors">
                  RTI drafting, civic complaints, and rankings are wired end-to-end for Delhi.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200/80 bg-white/80 p-3 dark:border-slate-800/80 dark:bg-slate-950/80 transition-colors">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-300 transition-colors">
                  India-ready
                </div>
                <p className="text-[13px] text-slate-600 dark:text-slate-300 transition-colors">
                  A single engine for all states. As data comes online, new states and features
                  appear here.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200/80 bg-white/80 p-3 dark:border-slate-800/80 dark:bg-slate-950/80 transition-colors">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-300 transition-colors">
                  Honest defaults
                </div>
                <p className="text-[13px] text-slate-600 dark:text-slate-300 transition-colors">
                  No fake switches or fake numbers – every action leads to real requests, payments,
                  and filings.
                </p>
              </div>
            </div>

            {showAdminLink && (
              <a
                href={`/system?adminUserId=${devAdminId}`}
                className="inline-flex items-center justify-center rounded-full bg-slate-100/80 px-3 py-1 text-[11px] font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-200 dark:bg-slate-900/80 dark:text-slate-100 dark:ring-slate-700 dark:hover:bg-slate-800 transition-colors"
              >
                Dev admin
              </a>
            )}
          </div>
        </div>
      </section>

      <section id="state-search" className="mt-8 space-y-4">
        <HomeStateSearchClient
          delhiReady={delhiReady}
          delhiStatusMessage={delhiStatusMessage}
          liveStateCodes={liveStateCodes}
          initialStateCode={initialStateCode}
        />
      </section>

      <section className="mt-10 grid gap-4 text-sm text-slate-700 dark:text-slate-200 sm:grid-cols-3 transition-colors">
        <Link
          href="/rti"
          className="flex min-h-[120px] flex-col justify-between rounded-xl border border-slate-200 bg-white/70 p-4 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-slate-700 transition-colors"
        >
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-300 transition-colors">
              RTI drafting
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-200 transition-colors">
              Draft RTIs tailored to your neta and constituency. Live for Delhi, built for India.
            </p>
          </div>
          <span className="mt-3 text-xs text-amber-600 dark:text-amber-300 transition-colors">Go to RTI</span>
        </Link>
        <Link
          href="/complaints"
          className="flex min-h-[120px] flex-col justify-between rounded-xl border border-slate-200 bg-white/70 p-4 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-slate-700 transition-colors"
        >
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-300 transition-colors">
              Civic complaints
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-200 transition-colors">
              Turn photos and locations into complaints that reach the right civic body in Delhi.
            </p>
          </div>
          <span className="mt-3 text-xs text-amber-600 dark:text-amber-300 transition-colors">Go to complaints</span>
        </Link>
        <Link
          href={delhiReady ? "/rankings/delhi" : "/politicians"}
          className="flex min-h-[120px] flex-col justify-between rounded-xl border border-slate-200 bg-white/70 p-4 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-slate-700 transition-colors"
        >
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-300 transition-colors">
              Rankings
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-200 transition-colors">
              See how Delhi MPs and MLAs stack up on cases, assets, and citizen votes.
            </p>
          </div>
          <span className="mt-3 text-xs text-amber-600 dark:text-amber-300 transition-colors">
            {delhiReady ? "View Delhi rankings" : "Browse politicians"}
          </span>
        </Link>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }}
      />
    </>
  );
}
