import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "neta politicians – MPs and MLAs across India (Delhi first)",
  description:
    "Browse MPs and MLAs on neta. Delhi is the first live state, with more states coming online as data is ingested.",
  openGraph: {
    type: "website",
    url: "https://neta.ink/politicians",
    title: "neta politicians – MPs and MLAs across India (Delhi first)",
    description:
      "Start with Delhi politicians on neta and see how MPs and MLAs will roll out across India over time.",
    images: ["/og-default.jpg"]
  },
  alternates: {
    canonical: "https://neta.ink/politicians"
  }
};

export default function PoliticiansIndexPage() {
  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50 sm:text-3xl">
          Politicians on neta
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          neta is designed for MPs and MLAs across India. Phase 1 is live for Delhi, with more
          states switching on as data is ingested and verified.
        </p>
      </header>

      <section className="space-y-3 text-sm text-slate-700 dark:text-slate-200">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Delhi politicians</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Browse all Delhi MLAs and MPs with basic details, cases, assets, and citizen ratings.
          </p>
          <a
            href="/politicians/delhi"
            className="mt-3 inline-flex min-h-[40px] items-center justify-center rounded-full bg-amber-400 px-4 text-xs font-medium text-slate-950 hover:bg-amber-300"
          >
            View Delhi politicians
          </a>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4 text-xs text-slate-600 dark:text-slate-300">
          As more states go live, this page will evolve into an India-wide directory of MPs and
          MLAs, with per-state rankings and deep profiles for each neta.
        </div>
      </section>
    </div>
  );
}

