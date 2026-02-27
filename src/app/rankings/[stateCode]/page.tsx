import Image from "next/image";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db/client";
import { states } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getRankingsByState } from "@/lib/rankings";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ stateCode: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const code = resolvedParams.stateCode.toUpperCase();
  const [stateRow] = await db.select().from(states).where(eq(states.code, code)).limit(1);

  if (!stateRow) return {};

  return {
    title: `neta rankings – ${stateRow.name} MPs and MLAs`,
    description: `See how ${stateRow.name} MPs and MLAs rank based on criminal cases, declared assets, and citizen votes on neta.`,
    openGraph: {
      type: "website",
      url: `https://neta.ink/rankings/${code.toLowerCase()}`,
      title: `neta rankings – ${stateRow.name} MPs and MLAs`,
      description: `Explore an experimental ranking of ${stateRow.name} MPs and MLAs using criminal cases, assets, and citizen votes on neta.`,
      images: ["/og-default.jpg"]
    },
    alternates: {
      canonical: `https://neta.ink/rankings/${code.toLowerCase()}`
    }
  };
}

export default async function StateRankingsPage({ params }: { params: Promise<{ stateCode: string }> }) {
  const resolvedParams = await params;
  const code = resolvedParams.stateCode.toUpperCase();
  
  const [stateRow] = await db.select().from(states).where(eq(states.code, code)).limit(1);
  if (!stateRow) return notFound();

  const rows = await getRankingsByState(stateRow.id, 100);

  return (
    <main className="min-h-screen">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/70 px-6 py-10 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/60 sm:px-10">
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="absolute -right-24 -bottom-24 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl" />
        </div>

        <header className="relative z-10 flex flex-col items-center gap-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Rankings · {stateRow.name}
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
            Civic Markets Leaderboard
          </h1>
          <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300">
            A premium, stock-style view of MPs and MLAs ranked by a composite score using cases, assets, and citizen votes.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="rounded-full border border-slate-200 bg-white/70 px-3 py-1 dark:border-slate-800 dark:bg-slate-950/70">
              {rows.length} listings
            </span>
            <span className="rounded-full border border-slate-200 bg-white/70 px-3 py-1 dark:border-slate-800 dark:bg-slate-950/70">
              Lower score = worse record
            </span>
            <Link
              href={`/politicians/${code.toLowerCase()}`}
              className="rounded-full border border-slate-200 bg-white/70 px-3 py-1 font-medium text-slate-700 hover:border-amber-400 hover:text-amber-600 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:text-amber-200"
            >
              View raw list
            </Link>
          </div>
        </header>

        {rows.length === 0 ? (
          <div className="relative z-10 mt-10 rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-300">
            No {stateRow.name} politicians found in the database yet.
          </div>
        ) : (
          <div className="relative z-10 mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((politician, index) => {
              const cases = politician.criminal_cases ?? 0;

              const assets_worth_in_rupees = Number(politician.assets_worth ?? BigInt(0));
              const formattedAssets = new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: "INR",
                maximumSignificantDigits: 3
              }).format(assets_worth_in_rupees);

              const severityBadge =
                cases === 0
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  : cases > 0 && cases <= 5
                  ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                  : "bg-rose-500/10 text-rose-600 border-rose-500/20";

              const cardGlow =
                cases > 5
                  ? "border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.1)]"
                  : "border-slate-200/80 dark:border-slate-800";

              const profileHref = `/politician/${politician.slug || politician.id}`;

              const totalVotes = (politician.votes_up ?? 0) + (politician.votes_down ?? 0);
              const volumeLabel = totalVotes === 0 ? "No votes yet" : `${totalVotes} votes`;

              return (
                <a
                  key={politician.id}
                  href={profileHref}
                  className={`group relative overflow-hidden rounded-2xl border bg-white p-5 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg dark:bg-slate-950/70 dark:hover:border-slate-700 ${cardGlow}`}
                >
                  <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="relative h-12 w-12 flex-shrink-0">
                        <Image
                          src={politician.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(politician.name)}&background=random&color=fff&size=256`}
                          alt={politician.name}
                          fill
                          className="rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800"
                          sizes="48px"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            #{index + 1}
                          </span>
                          <span className="truncate text-base font-semibold text-slate-900 dark:text-white">
                            {politician.name}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                            {politician.position}
                          </span>
                          <span className="truncate">{politician.party ?? "—"}</span>
                        </div>
                        <div className="mt-1 truncate max-w-[150px] text-xs text-slate-500 dark:text-slate-400">
                          {politician.constituencyName ?? "Constituency not recorded"}
                        </div>
                      </div>
                    </div>

                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${severityBadge}`}>
                      {cases} cases
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Assets
                      </div>
                      <div className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                        {formattedAssets}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Score
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-50">
                        {politician.score.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-medium text-emerald-600 dark:text-emerald-300">
                        {politician.votes_up ?? 0}
                      </span>{" "}
                      <span className="text-slate-400 dark:text-slate-500">/</span>{" "}
                      <span className="font-medium text-rose-600 dark:text-rose-300">
                        {politician.votes_down ?? 0}
                      </span>
                      <div className="mt-0.5 text-[11px]">{volumeLabel}</div>
                    </div>

                    <div className="text-right text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                        Open profile
                      </span>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
