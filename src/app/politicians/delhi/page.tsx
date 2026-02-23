import type { Metadata } from "next";
import { db } from "@/db/client";
import { constituencies, politicians, states } from "@/db/schema";
import { and, asc, eq, inArray } from "drizzle-orm";
import Link from "next/link";

export const metadata: Metadata = {
  title: "neta politicians – Delhi MPs and MLAs",
  description:
    "Browse all Delhi MPs and MLAs on neta with basic details, cases, ratings, and constituency information.",
  openGraph: {
    type: "website",
    url: "https://neta.ink/politicians/delhi",
    title: "neta politicians – Delhi MPs and MLAs",
    description:
      "See all Delhi MPs and MLAs listed on neta, with basic data on constituencies, parties, cases, and ratings.",
    images: ["/og-default.jpg"]
  },
  alternates: {
    canonical: "https://neta.ink/politicians/delhi"
  }
};

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
};

export default async function DelhiPoliticiansPage({ searchParams }: PageProps) {
  let delhi = null as (typeof states.$inferSelect) | null;
  let sorted: (typeof politicians.$inferSelect)[] = [];
  let constituencyMap = new Map<number, string>();
  let filterPosition: "MLA" | "MP" | undefined;
  let hadError = false;

  try {
    const [delhiRow] = await db
      .select()
      .from(states)
      .where(eq(states.code, "DL"))
      .limit(1);

    if (!delhiRow) {
      hadError = true;
    } else {
      delhi = delhiRow;

      const params = (await searchParams) ?? {};

      const rawPosition =
        typeof params.position === "string" ? params.position.toUpperCase() : undefined;

      const allowedPositions = ["MLA", "MP"] as const;
      filterPosition = allowedPositions.includes(rawPosition as any)
        ? (rawPosition as "MLA" | "MP")
        : undefined;

      const positionOrder = (pos: string) => {
        if (pos === "MP") return 0;
        if (pos === "MLA") return 1;
        return 2;
      };

      const rows =
        (await db
          .select()
          .from(politicians)
          .where(
            and(
              eq(politicians.state_id, delhi.id),
              inArray(politicians.position, ["MLA", "MP"])
            )
          )
          .orderBy(asc(politicians.name))) ?? [];

      const filtered = filterPosition
        ? rows.filter((p) => p.position === filterPosition)
        : rows;

      sorted = [...filtered].sort((a, b) => {
        const aRank = positionOrder(a.position ?? "");
        const bRank = positionOrder(b.position ?? "");
        if (aRank !== bRank) return aRank - bRank;
        return (a.name ?? "").localeCompare(b.name ?? "");
      });

      const constituencyIds = sorted
        .map((p) => p.constituency_id)
        .filter((id): id is number => typeof id === "number");

      if (constituencyIds.length > 0) {
        const constRows =
          (await db
            .select({
              id: constituencies.id,
              name: constituencies.name
            })
            .from(constituencies)
            .where(inArray(constituencies.id, constituencyIds))) ?? [];

        constituencyMap = new Map(constRows.map((c) => [c.id, c.name]));
      }
    }
  } catch (error) {
    console.error("Error loading Delhi politicians page", error);
    hadError = true;
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-6xl space-y-6">
        <header className="space-y-3">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Delhi Politicians</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            All MLAs and MPs for Delhi from the current seed, with basic details on constituencies, parties,
            cases and ratings.
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
            <span className="text-slate-500 dark:text-slate-400">Filter by position:</span>
            <Link
              href="/politicians/delhi"
              className={`rounded-full border px-3 py-1 ${
                !filterPosition
                  ? "border-amber-400/70 bg-amber-400 text-slate-950"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:border-amber-400/70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              }`}
            >
              All
            </Link>
            <Link
              href="/politicians/delhi?position=MLA"
              className={`rounded-full border px-3 py-1 ${
                filterPosition === "MLA"
                  ? "border-emerald-400/70 bg-emerald-400 text-emerald-950"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-400/70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              }`}
            >
              MLAs
            </Link>
            <Link
              href="/politicians/delhi?position=MP"
              className={`rounded-full border px-3 py-1 ${
                filterPosition === "MP"
                  ? "border-indigo-400/70 bg-indigo-400 text-indigo-950"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:border-indigo-400/70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              }`}
            >
              MPs
            </Link>
          </div>
        </header>

        {hadError ? (
          <div className="rounded-2xl border border-red-500/40 bg-red-100 dark:bg-red-950/40 p-4 text-sm text-red-700 dark:text-red-100">
            Delhi data is temporarily unavailable. System admin must run ingestion and seeding before this
            directory can load.
          </div>
        ) : !delhi ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80 p-4 text-sm text-slate-600 dark:text-slate-200">
            Delhi has not been initialized yet. Data will appear here once setup is complete.
          </div>
        ) : sorted.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80 p-4 text-sm text-slate-600 dark:text-slate-200">
            No politicians found for Delhi yet. Data will appear here once setup is complete.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80">
            <div className="border-b border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/80 px-4 py-3 text-left text-xs text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-slate-900 dark:text-slate-100">Directory</span>
              <span className="ml-2 text-slate-500">
                {sorted.length} politicians · click a name for full profile
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs sm:text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Name</th>
                    <th className="px-3 py-2 text-left font-medium">Position</th>
                    <th className="px-3 py-2 text-left font-medium">Constituency</th>
                    <th className="px-3 py-2 text-left font-medium">Party</th>
                    <th className="px-3 py-2 text-left font-medium">Cases</th>
                    <th className="px-3 py-2 text-left font-medium">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((p, index) => {
                    const positionBadgeClass =
                      p.position === "MP"
                        ? "bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-200 border-indigo-500/40"
                        : "bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-200 border-emerald-500/40";

                    const rowBgClass =
                      index % 2 === 0
                        ? "bg-white dark:bg-slate-950"
                        : "bg-slate-50 dark:bg-slate-950/80";

                    return (
                      <tr key={p.id} className={rowBgClass}>
                        <td className="px-3 py-2 align-top">
                          <Link
                            href={`/politician/${p.id}`}
                            className="text-sm font-medium text-amber-600 dark:text-amber-200 hover:underline"
                          >
                            {p.name}
                          </Link>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${positionBadgeClass}`}
                          >
                            {p.position}
                          </span>
                        </td>
                        <td className="px-3 py-2 align-top text-xs text-slate-600 dark:text-slate-200">
                          {typeof p.constituency_id === "number"
                            ? constituencyMap.get(p.constituency_id) ?? "—"
                            : "—"}
                        </td>
                        <td className="px-3 py-2 align-top text-xs text-slate-600 dark:text-slate-200">
                          {p.party ?? "—"}
                        </td>
                        <td className="px-3 py-2 align-top text-xs text-slate-600 dark:text-slate-200">
                          {p.criminal_cases ?? 0}
                        </td>
                        <td className="px-3 py-2 align-top text-xs text-slate-600 dark:text-slate-200">
                          {Number(p.rating ?? 0).toFixed(1)} / 5
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
