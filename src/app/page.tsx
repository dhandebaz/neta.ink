import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/db/client";
import { states } from "@/db/schema";
import { eq } from "drizzle-orm";
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

  try {
    const rows = await db
      .select()
      .from(states)
      .where(eq(states.code, "DL"))
      .limit(1);

    const delhi = rows[0] ?? null;
    const ingestionStatus = delhi?.ingestion_status ?? "missing";
    const delhiEnabled = delhi?.is_enabled ?? false;
    delhiReady = delhiEnabled && ingestionStatus === "ready";

    if (!delhi) {
      delhiStatusMessage =
        "Delhi is not initialized yet. System admin must seed the state before citizens can use it.";
    } else if (ingestionStatus === "idle") {
      delhiStatusMessage =
        "Delhi is enabled but ingestion has not been run. System admin must trigger Delhi ingestion.";
    } else if (ingestionStatus === "ingesting") {
      delhiStatusMessage = "Delhi data is currently being ingested.";
    } else if (ingestionStatus === "error") {
      delhiStatusMessage =
        "Delhi ingestion failed. Please check the admin ingest endpoint and logs.";
    }
  } catch (error) {
    console.error("Error loading Delhi state for home page", error);
    delhiStatusMessage =
      "Delhi status is temporarily unavailable. System admin should check database connectivity.";
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
      <section className="space-y-6 pt-4 sm:pt-6">
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-amber-300">
            India-wide · Phase 1: Delhi
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">
            Hold your neta accountable.
          </h1>
          <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
            neta helps citizens across India file RTIs, document civic complaints, and see how MPs
            and MLAs rank – starting with Delhi. Designed for mobile, backed by real data and
            filings.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <a
            href="#state-search"
            className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-amber-400 px-4 text-sm font-medium text-slate-950 shadow hover:bg-amber-300"
          >
            Find your representative
          </a>
          <Link
            href="/complaints"
            className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-slate-100 px-4 text-sm font-medium text-slate-900 hover:bg-slate-200"
          >
            File a complaint
          </Link>
          <Link
            href="/rti"
            className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-slate-600 px-4 text-sm font-medium text-slate-100 hover:bg-slate-800"
          >
            Draft an RTI
          </Link>
        </div>

        <div className="grid gap-3 text-xs text-slate-400 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-amber-300">
              Delhi live
            </div>
            <p className="text-[13px] text-slate-300">
              RTI drafting, civic complaints, and rankings are wired end-to-end for Delhi.
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-amber-300">
              India-ready
            </div>
            <p className="text-[13px] text-slate-300">
              A single engine for all states. As data comes online, features switch on via admin
              controls.
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-amber-300">
              Honest defaults
            </div>
            <p className="text-[13px] text-slate-300">
              No mock toggles or fake numbers – every action is backed by real APIs, payments, and
              filings.
            </p>
          </div>
        </div>

        {showAdminLink && (
          <a
            href={`/system?adminUserId=${devAdminId}`}
            className="fixed bottom-3 right-3 inline-flex items-center justify-center rounded-full bg-slate-900/80 px-3 py-1 text-[11px] font-medium text-slate-100 ring-1 ring-slate-700 hover:bg-slate-800"
          >
            Dev admin
          </a>
        )}
      </section>

      <section id="state-search" className="mt-8 space-y-4">
        <HomeStateSearchClient delhiReady={delhiReady} delhiStatusMessage={delhiStatusMessage} />
      </section>

      <section className="mt-10 grid gap-4 text-sm text-slate-200 sm:grid-cols-3">
        <Link
          href="/rti"
          className="flex min-h-[120px] flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/70 p-4"
        >
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-300">
              RTI drafting
            </div>
            <p className="text-sm text-slate-200">
              Draft RTIs tailored to your neta and constituency. Live for Delhi, built for India.
            </p>
          </div>
          <span className="mt-3 text-xs text-amber-300">Go to RTI</span>
        </Link>
        <Link
          href="/complaints"
          className="flex min-h-[120px] flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/70 p-4"
        >
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-300">
              Civic complaints
            </div>
            <p className="text-sm text-slate-200">
              Turn photos and locations into complaints that reach the right civic body in Delhi.
            </p>
          </div>
          <span className="mt-3 text-xs text-amber-300">Go to complaints</span>
        </Link>
        <Link
          href={delhiReady ? "/rankings/delhi" : "/politicians"}
          className="flex min-h-[120px] flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/70 p-4"
        >
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-300">
              Rankings
            </div>
            <p className="text-sm text-slate-200">
              See how Delhi MPs and MLAs stack up on cases, assets, and citizen votes.
            </p>
          </div>
          <span className="mt-3 text-xs text-amber-300">
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
