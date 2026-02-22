import type { Metadata } from "next";
import { db } from "@/db/client";
import {
  complaints,
  constituencies,
  politicians,
  rti_requests,
  states
} from "@/db/schema";
import { and, eq } from "drizzle-orm";
import Link from "next/link";

type PageProps = {
  params: Promise<{ id: string }>;
};

function formatCrores(value: bigint): string {
  const crores = Number(value) / 10_000_000;
  if (!Number.isFinite(crores)) return "0";
  return crores.toFixed(2);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const id = Number(resolvedParams.id);

  if (!Number.isFinite(id) || id <= 0) {
    return {
      title: "neta politician – not found",
      description: "This politician profile could not be found on neta.",
      openGraph: {
        type: "website",
        url: `https://neta.ink/politician/${encodeURIComponent(resolvedParams.id)}`,
        title: "neta politician – not found",
        description: "This politician profile could not be found on neta.",
        images: ["/og-default.jpg"]
      },
      alternates: {
        canonical: `https://neta.ink/politician/${encodeURIComponent(resolvedParams.id)}`
      }
    };
  }

  try {
    const rows = await db
      .select()
      .from(politicians)
      .where(eq(politicians.id, id))
      .limit(1);

    const politicianRow = rows[0];

    if (!politicianRow) {
      return {
        title: "neta politician – not found",
        description: "This politician profile could not be found on neta.",
        openGraph: {
          type: "website",
          url: `https://neta.ink/politician/${encodeURIComponent(resolvedParams.id)}`,
          title: "neta politician – not found",
          description: "This politician profile could not be found on neta.",
          images: ["/og-default.jpg"]
        },
        alternates: {
          canonical: `https://neta.ink/politician/${encodeURIComponent(resolvedParams.id)}`
        }
      };
    }

    const title = `${politicianRow.name} – ${politicianRow.position} on neta`;
    const description =
      "View this representative's role, constituency, declared assets, cases, and citizen activity on neta.";

    return {
      title,
      description,
      openGraph: {
        type: "website",
        url: `https://neta.ink/politician/${encodeURIComponent(resolvedParams.id)}`,
        title,
        description,
        images: ["/og-default.jpg"]
      },
      alternates: {
        canonical: `https://neta.ink/politician/${encodeURIComponent(resolvedParams.id)}`
      }
    };
  } catch (error) {
    console.error("Error loading politician metadata", error);
    return {
      title: "neta politician – not available",
      description: "This politician profile is temporarily unavailable.",
      openGraph: {
        type: "website",
        url: `https://neta.ink/politician/${encodeURIComponent(resolvedParams.id)}`,
        title: "neta politician – not available",
        description: "This politician profile is temporarily unavailable.",
        images: ["/og-default.jpg"]
      },
      alternates: {
        canonical: `https://neta.ink/politician/${encodeURIComponent(resolvedParams.id)}`
      }
    };
  }
}

export default async function PoliticianPage({ params }: PageProps) {
  const resolvedParams = await params;
  const id = Number(resolvedParams.id);

  if (!Number.isFinite(id) || id <= 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-full max-w-xl space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-slate-50">Politician</h1>
          <p className="text-sm text-red-400">Invalid politician id.</p>
        </div>
      </div>
    );
  }

  let politician: (typeof politicians.$inferSelect) | null = null;
  let stateRow: (typeof states.$inferSelect) | null = null;
  let constituencyName: string | null = null;
  let complaintsCount = 0;
  let rtiCount = 0;
  let ratingNumber = 0;

  try {
    const rows =
      (await db
        .select()
        .from(politicians)
        .where(eq(politicians.id, id))
        .limit(1)) ?? [];

    politician = rows[0] ?? null;

    if (politician) {
      const [stateRowInner] =
        (await db
          .select()
          .from(states)
          .where(eq(states.id, politician.state_id))
          .limit(1)) ?? [];

      stateRow = stateRowInner ?? null;

      if (politician.constituency_id) {
        const [constRow] =
          (await db
            .select()
            .from(constituencies)
            .where(eq(constituencies.id, politician.constituency_id))
            .limit(1)) ?? [];

        if (constRow) {
          constituencyName = constRow.name;
        }
      }

      const [complaintRows, rtiRows] =
        (await Promise.all([
          db
            .select({ id: complaints.id })
            .from(complaints)
            .where(eq(complaints.politician_id, politician.id)),
          db
            .select({ id: rti_requests.id })
            .from(rti_requests)
            .where(eq(rti_requests.politician_id, politician.id))
        ])) ?? [];

      complaintsCount = Array.isArray(complaintRows) ? complaintRows.length : 0;
      rtiCount = Array.isArray(rtiRows) ? rtiRows.length : 0;
      ratingNumber = Number(politician.rating ?? 0);
    }
  } catch (error) {
    console.error("Error loading politician profile", error);
  }

  if (!politician) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-full max-w-xl space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-slate-50">Politician</h1>
          <p className="text-sm text-red-400">
            Politician not found or this profile is temporarily unavailable.
          </p>
        </div>
      </div>
    );
  }

  const complaintsLabel =
    complaintsCount === 1 ? "1 complaint" : `${complaintsCount} complaints`;
  const rtisLabel = rtiCount === 1 ? "1 RTI" : `${rtiCount} RTIs`;

  const targetType =
    politician.position === "MP" || politician.position === "MLA"
      ? politician.position
      : "MLA";

  const structuredData: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: politician.name
  };

  if (politician.position) {
    structuredData.jobTitle = politician.position;
  }

  if (politician.party) {
    structuredData.memberOf = {
      "@type": "Organization",
      name: politician.party
    };
  }

  const address: Record<string, any> = {
    "@type": "PostalAddress",
    addressCountry: "IN"
  };

  if (stateRow?.name) {
    address.addressRegion = stateRow.name;
  }

  if (constituencyName) {
    address.addressLocality = constituencyName;
  }

  if (address.addressRegion || address.addressLocality) {
    structuredData.address = address;
  }

  return (
    <div className="space-y-6">
      <div className="w-full max-w-3xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold text-slate-50">{politician.name}</h1>
          <p className="text-sm text-slate-300">
            {politician.position}{" "}
            {constituencyName ? `· ${constituencyName}` : null}{" "}
            {stateRow ? `· ${stateRow.name}` : null}
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-[1.5fr,1fr]">
          <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-100">
            <div>
              <div className="font-semibold text-slate-200">Party</div>
              <div className="text-slate-100">{politician.party ?? "Not specified"}</div>
            </div>
            <div>
              <div className="font-semibold text-slate-200">Criminal cases</div>
              <div className="text-slate-100">{politician.criminal_cases ?? 0}</div>
            </div>
            <div>
              <div className="font-semibold text-slate-200">Assets</div>
              <div className="text-slate-100">
                ₹ {formatCrores(politician.assets_worth)} crore
              </div>
            </div>
            <div>
              <div className="font-semibold text-slate-200">Rating</div>
              <div className="text-slate-100">
                {ratingNumber.toFixed(1)} / 5 ({politician.votes_up} up,{" "}
                {politician.votes_down} down)
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-100">
            <div>
              <div className="font-semibold text-slate-200">Citizen activity</div>
              <div className="text-slate-100">
                {complaintsLabel} · {rtisLabel}
              </div>
            </div>
            <div className="space-y-2">
              <Link
                href={`/complaints?politicianId=${politician.id}`}
                className="block w-full rounded-full bg-emerald-500 px-4 py-2 text-center text-sm font-medium text-slate-950 hover:bg-emerald-400"
              >
                File complaint about this representative
              </Link>
              <Link
                href={`/rti?politicianId=${politician.id}&targetType=${encodeURIComponent(
                  targetType
                )}`}
                className="block w-full rounded-full bg-amber-400 px-4 py-2 text-center text-sm font-medium text-slate-950 hover:bg-amber-300"
              >
                File RTI referencing this representative
              </Link>
            </div>
          </div>
        </section>

        <section className="space-y-1 text-xs text-slate-400">
          {politician.myneta_url && (
            <div>
              MyNeta:{" "}
              <a href={politician.myneta_url} className="text-amber-300 hover:underline">
                {politician.myneta_url}
              </a>
            </div>
          )}
          {politician.wikipedia_url && (
            <div>
              Wikipedia:{" "}
              <a href={politician.wikipedia_url} className="text-amber-300 hover:underline">
                {politician.wikipedia_url}
              </a>
            </div>
          )}
        </section>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
    </div>
  );
}
