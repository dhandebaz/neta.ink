import type { Metadata, ResolvingMetadata } from "next";
import { db } from "@/db/client";
import {
  complaints,
  constituencies,
  politicians,
  politician_mentions,
  rti_requests,
  states,
  votes
} from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { VotingClient } from "./VotingClient";
import ShareButtonClient from "@/components/ShareButtonClient";

type PageProps = {
  params: Promise<{ id: string }>;
};

function formatCrores(value: bigint): string {
  const crores = Number(value) / 10_000_000;
  if (!Number.isFinite(crores)) return "0";
  return crores.toFixed(2);
}

export async function generateMetadata(
  { params }: PageProps,
  _parent: ResolvingMetadata
): Promise<Metadata> {
  const resolvedParams = await params;
  const id = Number(resolvedParams.id);

  if (Number.isNaN(id)) {
    return {
      title: "Not Found"
    };
  }

  const rows = await db
    .select()
    .from(politicians)
    .where(eq(politicians.id, id))
    .limit(1);

  const politician = rows[0];

  if (!politician) {
    return {
      title: "Politician Not Found"
    };
  }

  const title = `${politician.name} - ${politician.party} | NetaInk`;
  const description = `View ${politician.name}'s civic rating, declared assets (₹${(
    Number(politician.assets_worth) / 10000000
  ).toFixed(1)} Cr), and criminal cases. Vote and hold them accountable on NetaInk.`;

  const image = politician.photo_url || "/og-default.jpg";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [image],
      type: "profile"
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image]
    }
  };
}

export default async function PoliticianPage({ params }: PageProps) {
  const resolvedParams = await params;
  const id = Number(resolvedParams.id);

  if (!Number.isFinite(id) || id <= 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-full max-w-xl space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Politician</h1>
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
  let currentUserVote: "up" | "down" | null = null;
  let mentions: (typeof politician_mentions.$inferSelect)[] = [];

  const currentUser = await getCurrentUser();

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

      const [complaintRows, rtiRows, mentionRows] =
        (await Promise.all([
          db
            .select({ id: complaints.id })
            .from(complaints)
            .where(eq(complaints.politician_id, politician.id)),
          db
            .select({ id: rti_requests.id })
            .from(rti_requests)
            .where(eq(rti_requests.politician_id, politician.id)),
          db
            .select()
            .from(politician_mentions)
            .where(eq(politician_mentions.politician_id, politician.id))
            .orderBy(desc(politician_mentions.published_at), desc(politician_mentions.created_at))
            .limit(5)
        ])) ?? [];

      complaintsCount = Array.isArray(complaintRows) ? complaintRows.length : 0;
      rtiCount = Array.isArray(rtiRows) ? rtiRows.length : 0;
      ratingNumber = Number(politician.rating ?? 0);
      mentions = Array.isArray(mentionRows) ? mentionRows : [];

      if (currentUser) {
        const [voteRow] =
          (await db
            .select()
            .from(votes)
            .where(
              and(
                eq(votes.user_id, currentUser.id),
                eq(votes.politician_id, politician.id)
              )
            )
            .limit(1)) ?? [];

        if (voteRow && (voteRow.vote_type === "up" || voteRow.vote_type === "down")) {
          currentUserVote = voteRow.vote_type;
        }
      }
    }
  } catch (error) {
    console.error("Error loading politician profile", error);
  }

  if (!politician) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-full max-w-xl space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Politician</h1>
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

  const formatDate = (value: Date | null) => {
    if (!value) return "";
    try {
      return value.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric"
      });
    } catch {
      return "";
    }
  };

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
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-50">{politician.name}</h1>
            <ShareButtonClient
              title={politician.name}
              text={`Check out ${politician.name} on NetaInk. Rating: ${ratingNumber}/5`}
              url={`https://neta.ink/politician/${politician.id}`}
            />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {politician.position}{" "}
            {constituencyName ? `· ${constituencyName}` : null}{" "}
            {stateRow ? `· ${stateRow.name}` : null}
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-[1.5fr,1fr]">
          <div className="space-y-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4 text-sm text-slate-800 dark:text-slate-100">
            <div>
              <div className="font-semibold text-slate-600 dark:text-slate-200">Party</div>
              <div className="text-slate-900 dark:text-slate-100">{politician.party ?? "Not specified"}</div>
            </div>
            <div>
              <div className="font-semibold text-slate-600 dark:text-slate-200">Criminal cases</div>
              <div className="text-slate-900 dark:text-slate-100">{politician.criminal_cases ?? 0}</div>
            </div>
            <div>
              <div className="font-semibold text-slate-600 dark:text-slate-200">Assets</div>
              <div className="text-slate-900 dark:text-slate-100">
                ₹ {formatCrores(politician.assets_worth)} crore
              </div>
            </div>
            <div>
              <div className="font-semibold text-slate-600 dark:text-slate-200">Rating</div>
              <VotingClient
                politicianId={politician.id}
                initialVotesUp={politician.votes_up}
                initialVotesDown={politician.votes_down}
                initialRating={ratingNumber}
                initialUserVote={currentUserVote}
                isLoggedIn={Boolean(currentUser)}
                isVoterVerified={Boolean(currentUser?.voter_id_verified)}
              />
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4 text-sm text-slate-800 dark:text-slate-100">
            <div>
              <div className="font-semibold text-slate-600 dark:text-slate-200">Citizen activity</div>
              <div className="text-slate-900 dark:text-slate-100">
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

        <section className="space-y-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              Latest Updates &amp; Mentions
            </h2>
          </div>
          {mentions.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No recent updates tracked. Our AI agents sweep for news periodically.
            </p>
          ) : (
            <div className="space-y-3">
              {mentions.map((m) => {
                const sentiment = (m.sentiment ?? "neutral").toLowerCase();
                let sentimentLabel = "Neutral";
                let sentimentClass =
                  "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700";
                if (sentiment === "positive") {
                  sentimentLabel = "Positive";
                  sentimentClass =
                    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/50";
                } else if (sentiment === "negative") {
                  sentimentLabel = "Negative";
                  sentimentClass =
                    "bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/50";
                }

                const publishedLabel = m.published_at
                  ? formatDate(m.published_at)
                  : "";

                return (
                  <a
                    key={m.id}
                    href={m.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 p-3 transition hover:border-amber-400/70 hover:bg-slate-100 dark:hover:bg-slate-900"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${sentimentClass}`}
                      >
                        {sentimentLabel}
                      </span>
                      {publishedLabel && (
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {publishedLabel}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-50">
                      {m.title}
                    </div>
                    <p className="mt-1 line-clamp-3 text-xs text-slate-500 dark:text-slate-400">
                      {m.snippet}
                    </p>
                  </a>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
          {politician.myneta_url && (
            <div>
              MyNeta:{" "}
              <a href={politician.myneta_url} className="text-amber-600 dark:text-amber-300 hover:underline">
                {politician.myneta_url}
              </a>
            </div>
          )}
          {politician.wikipedia_url && (
            <div>
              Wikipedia:{" "}
              <a href={politician.wikipedia_url} className="text-amber-600 dark:text-amber-300 hover:underline">
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
