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
      return;
    }

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
  } catch (error) {
    console.error("Error loading Delhi politicians page", error);
    hadError = true;
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-6xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">Delhi Politicians</h1>
          <p className="text-sm text-slate-600">
            All MLAs and MPs for Delhi from the current seed, with basic details.
          </p>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-600">Filter by position:</span>
            <Link
              href="/politicians/delhi"
              className={`px-3 py-1 rounded border ${
                !filterPosition ? "bg-slate-900 text-white" : "bg-white"
              }`}
            >
              All
            </Link>
            <Link
              href="/politicians/delhi?position=MLA"
              className={`px-3 py-1 rounded border ${
                filterPosition === "MLA" ? "bg-slate-900 text-white" : "bg-white"
              }`}
            >
              MLAs
            </Link>
            <Link
              href="/politicians/delhi?position=MP"
              className={`px-3 py-1 rounded border ${
                filterPosition === "MP" ? "bg-slate-900 text-white" : "bg-white"
              }`}
            >
              MPs
            </Link>
          </div>
        </header>

        {!delhi || hadError ? (
          <p className="text-sm text-slate-600">
            Delhi has not been initialized yet or data is temporarily unavailable. System admin must run ingestion and seeding.
          </p>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-slate-600">
            No politicians found for Delhi yet. Please check the admin panel or ingestion status.
          </p>
        ) : (
          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Position</th>
                  <th className="px-3 py-2 text-left">Constituency</th>
                  <th className="px-3 py-2 text-left">Party</th>
                  <th className="px-3 py-2 text-left">Criminal cases</th>
                  <th className="px-3 py-2 text-left">Rating</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-3 py-2 align-top">
                      <Link
                        href={`/politician/${p.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2 align-top">{p.position}</td>
                    <td className="px-3 py-2 align-top">
                      {typeof p.constituency_id === "number"
                        ? constituencyMap.get(p.constituency_id) ?? "—"
                        : "—"}
                    </td>
                    <td className="px-3 py-2 align-top">{p.party ?? "—"}</td>
                    <td className="px-3 py-2 align-top">
                      {p.criminal_cases ?? 0}
                    </td>
                    <td className="px-3 py-2 align-top">
                      {Number(p.rating ?? 0).toFixed(1)} / 5
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
