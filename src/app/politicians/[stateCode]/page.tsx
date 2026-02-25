import type { Metadata } from "next";
import { db } from "@/db/client";
import { constituencies, politicians, states } from "@/db/schema";
import { and, asc, eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ stateCode: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const code = resolvedParams.stateCode.toUpperCase();
  const [stateRow] = await db.select().from(states).where(eq(states.code, code)).limit(1);

  if (!stateRow) return {};

  return {
    title: `neta politicians – ${stateRow.name} MPs and MLAs`,
    description: `Browse all ${stateRow.name} MPs and MLAs on neta with basic details, cases, ratings, and constituency information.`,
    openGraph: {
      type: "website",
      url: `https://neta.ink/politicians/${code.toLowerCase()}`,
      title: `neta politicians – ${stateRow.name} MPs and MLAs`,
      description: `See all ${stateRow.name} MPs and MLAs listed on neta, with basic data on constituencies, parties, cases, and ratings.`,
      images: ["/og-default.jpg"]
    },
    alternates: {
      canonical: `https://neta.ink/politicians/${code.toLowerCase()}`
    }
  };
}

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ stateCode: string }>;
  searchParams?: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
};

export default async function StatePoliticiansPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const code = resolvedParams.stateCode.toUpperCase();
  
  let state = null as (typeof states.$inferSelect) | null;
  let sorted: (typeof politicians.$inferSelect)[] = [];
  let constituencyMap = new Map<number, string>();
  let filterPosition: "MLA" | "MP" | undefined;
  let hadError = false;

  try {
    const [stateRow] = await db
      .select()
      .from(states)
      .where(eq(states.code, code))
      .limit(1);

    if (!stateRow) {
      hadError = true;
    } else {
      state = stateRow;

      const sp = (await searchParams) ?? {};

      const rawPosition =
        typeof sp.position === "string" ? sp.position.toUpperCase() : undefined;

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
              eq(politicians.state_id, state.id),
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

        for (const c of constRows) {
          constituencyMap.set(c.id, c.name);
        }
      }
    }
  } catch (error) {
    console.error(`Error loading ${code} politicians:`, error);
    hadError = true;
  }
  
  if (!state && !hadError) return notFound();
  if (!state && hadError) {
      // Allow rendering error state
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-5xl space-y-6">
        <header className="space-y-3 text-center">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
            {state ? state.name : code} Politicians
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Browse {sorted.length} MPs and MLAs currently in our database for {state ? state.name : code}.
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <Link
              href={`/politicians/${code.toLowerCase()}`}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                !filterPosition
                  ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700"
              }`}
            >
              All
            </Link>
            <Link
              href={`/politicians/${code.toLowerCase()}?position=mp`}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                filterPosition === "MP"
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700"
              }`}
            >
              MPs
            </Link>
            <Link
              href={`/politicians/${code.toLowerCase()}?position=mla`}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                filterPosition === "MLA"
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700"
              }`}
            >
              MLAs
            </Link>
          </div>
        </header>

        {hadError && (
          <div className="rounded-lg bg-red-50 p-4 text-center text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            Failed to load politicians. Please try again later.
          </div>
        )}

        {!hadError && sorted.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80 p-8 text-center">
            <p className="text-slate-500 dark:text-slate-400">
              No politicians found matching your filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((p) => {
              const cName = p.constituency_id
                ? constituencyMap.get(p.constituency_id)
                : "Unknown";

              return (
                <Link
                  key={p.id}
                  href={`/politician/${p.id}`}
                  className="group block overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80 p-4 transition-all hover:border-slate-300 hover:shadow-md dark:hover:border-slate-700"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {p.name}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {p.party} • {cName}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                        p.position === "MP"
                          ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                          : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                      }`}
                    >
                      {p.position}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/50 pt-3">
                    <div>
                      <span className="block font-medium text-slate-900 dark:text-slate-200">
                        {p.criminal_cases ?? 0}
                      </span>
                      Cases
                    </div>
                    <div>
                      <span className="block font-medium text-slate-900 dark:text-slate-200">
                        ₹{(Number(p.assets_worth ?? 0) / 10000000).toFixed(1)}cr
                      </span>
                      Assets
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
