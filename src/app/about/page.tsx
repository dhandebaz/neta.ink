import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About neta – civic accountability for India, starting with Delhi",
  description:
    "Learn what neta is, how it works technically, and how it is rolling out from Delhi to the rest of India.",
  openGraph: {
    type: "website",
    url: "https://neta.ink/about",
    title: "About neta – civic accountability for India, starting with Delhi",
    description:
      "neta is a civic tool to help people across India hold elected representatives accountable, with phase 1 focused on Delhi.",
    images: ["/og-default.jpg"]
  }
};

export default function AboutPage() {
  return (
    <main className="space-y-8">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl">
          About neta
        </h1>
        <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
          neta is a civic tool to help people across India hold elected representatives accountable.
          It is designed for mobile, focused on real RTIs, civic complaints, and public rankings
          that are grounded in data and actual filings.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-50">What is neta?</h2>
        <p className="max-w-3xl text-sm text-slate-300">
          neta is built to make it easier for ordinary citizens to understand who represents them,
          document local civic issues, and draft formal requests for information. The experience is
          India-wide in design, but the first live phase focuses on Delhi, including MPs, MLAs, and
          local complaints that are routed to the right civic bodies where possible.
        </p>
        <p className="max-w-3xl text-sm text-slate-300">
          Over time, more states and data sources will be added so that similar flows work across
          India, while keeping the core principles the same: transparency, accountability, and
          citizen control over what is sent in their name.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-50">What neta does technically</h2>
        <p className="max-w-3xl text-sm text-slate-300">
          Under the hood, neta combines public election data, affidavits, and civic body contacts
          with modern infrastructure. A managed Postgres database stores core data about states,
          representatives, complaints, and RTI drafts. Cloud object storage is used for uploads such
          as complaint photos.
        </p>
        <p className="max-w-3xl text-sm text-slate-300">
          AI models are used to help draft RTIs and complaint descriptions under the RTI Act 2005
          and related civic processes. The AI output is always a starting point: every draft is
          shown to the user in full, and the user can edit the text before anything is saved or
          sent.
        </p>
        <p className="max-w-3xl text-sm text-slate-300">
          Email and payment systems are used to route and track work. For complaints, the app
          prepares emails that can be sent to the appropriate civic contacts when configured, with
          the citizen&apos;s details included so that replies can be associated with their case. For
          RTIs, the app focuses on generating a clean draft and guidance; filing and paying the
          statutory RTI fee happen on the official portals that the user chooses to use.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-50">State coverage roadmap</h2>
        <p className="max-w-3xl text-sm text-slate-300">
          neta is designed for India-wide coverage, but the rollout is phased. Delhi is currently
          the primary live state for RTI drafting, civic complaints, and representative rankings.
        </p>
        <p className="max-w-3xl text-sm text-slate-300">
          As additional states come online, the goal is to reuse the same patterns: verified public
          data about representatives, structured civic complaint flows, and RTI drafting that stays
          within Indian law while giving citizens clear control over their own information.
        </p>
        <p className="max-w-3xl text-sm text-slate-300">
          Until then, users outside Delhi can still browse available information and structures
          where data exists, while full live flows expand state by state.
        </p>
      </section>
    </main>
  );
}

