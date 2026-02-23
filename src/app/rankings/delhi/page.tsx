import type { Metadata } from "next";
import Link from "next/link";
import { getDelhiRankings } from "@/lib/rankings";

export const metadata: Metadata = {
  title: "neta rankings – Delhi MPs and MLAs",
  description:
    "See how Delhi MPs and MLAs rank based on criminal cases, declared assets, and citizen votes on neta.",
  openGraph: {
    type: "website",
    url: "https://neta.ink/rankings/delhi",
    title: "neta rankings – Delhi MPs and MLAs",
    description:
      "Explore an experimental ranking of Delhi MPs and MLAs using criminal cases, assets, and citizen votes on neta.",
    images: ["/og-default.jpg"]
  },
  alternates: {
    canonical: "https://neta.ink/rankings/delhi"
  }
};

function formatCrores(assets: bigint): string {
  const crores = Number(assets) / 10_000_000;
  if (!Number.isFinite(crores)) return "0";
  return crores.toFixed(2);
}

export default async function DelhiRankingsPage() {
  const rows = await getDelhiRankings(100);

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-5xl space-y-6">
        <header className="space-y-3 text-center">
          <h1 className="text-3xl font-bold text-slate-50">Delhi Politicians – Worst to Best</h1>
          <p className="text-sm text-slate-300">
            Experimental ranking of Delhi MPs and MLAs by cases, assets and citizen votes.
          </p>
          <p className="text-xs text-slate-400">
            Lower scores are worse. Use this as a directional civic signal, not a legal verdict.
          </p>
          <p className="text-xs">
            <Link
              href="/politicians/delhi"
              className="inline-flex items-center justify-center rounded-full border border-slate-600 bg-slate-900/80 px-3 py-1 text-[11px] font-medium text-slate-100 hover:border-amber-400 hover:text-amber-200"
            >
              View as raw list
            </Link>
          </p>
        </header>

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-center text-sm text-slate-300">
            No Delhi politicians found in the database yet. Once Delhi data is seeded, rankings
            will appear here automatically.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/80">
            <div className="border-b border-slate-800/80 bg-slate-900/80 px-4 py-3 text-left text-xs text-slate-300">
              <span className="font-semibold text-slate-100">Rankings snapshot</span>
              <span className="ml-2 text-slate-500">
                {rows.length} politicians · lower score = worse overall record
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs sm:text-sm">
                <thead className="bg-slate-900/80 text-slate-300">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Rank</th>
                    <th className="px-3 py-2 text-left font-medium">Name</th>
                    <th className="px-3 py-2 text-left font-medium">Pos</th>
                    <th className="px-3 py-2 text-left font-medium">Constituency</th>
                    <th className="px-3 py-2 text-left font-medium">Party</th>
                    <th className="px-3 py-2 text-left font-medium">Cases</th>
                    <th className="px-3 py-2 text-left font-medium">Assets (₹ cr)</th>
                    <th className="px-3 py-2 text-left font-medium">Votes</th>
                    <th className="px-3 py-2 text-left font-medium">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => {
                    const rank = index + 1;
                    const isTop = rank <= 3;
                    const isBottom = rank > rows.length - 3;

                    const rankBadgeClass =
                      rank === 1
                        ? "bg-amber-400 text-slate-950"
                        : rank === 2
                        ? "bg-slate-800 text-amber-200"
                        : rank === 3
                        ? "bg-slate-800 text-slate-100"
                        : "bg-slate-900 text-slate-300";

                    const positionBadgeClass =
                      row.position === "MP"
                        ? "bg-indigo-500/20 text-indigo-200 border-indigo-500/40"
                        : "bg-emerald-500/20 text-emerald-200 border-emerald-500/40";

                    const rowBgClass = isTop
                      ? "bg-slate-900/80"
                      : isBottom
                      ? "bg-red-950/40"
                      : index % 2 === 0
                      ? "bg-slate-950"
                      : "bg-slate-950/80";

                    const totalVotes = row.votes_up + row.votes_down;

                    return (
                      <tr key={row.id} className={rowBgClass}>
                        <td className="px-3 py-2 align-top">
                          <span
                            className={`inline-flex min-w-[2rem] items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${rankBadgeClass}`}
                          >
                            {rank}
                          </span>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <a
                            href={`/politician/${row.id}`}
                            className="text-sm font-medium text-amber-200 hover:underline"
                          >
                            {row.name}
                          </a>
                          <div className="mt-0.5 text-[11px] text-slate-400">
                            {row.constituencyName ?? "Constituency not recorded"}
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${positionBadgeClass}`}
                          >
                            {row.position}
                          </span>
                        </td>
                        <td className="px-3 py-2 align-top text-xs text-slate-200">
                          {row.constituencyName ?? "—"}
                        </td>
                        <td className="px-3 py-2 align-top text-xs text-slate-200">
                          {row.party ?? "—"}
                        </td>
                        <td className="px-3 py-2 align-top text-xs text-slate-200">
                          {row.criminal_cases}
                        </td>
                        <td className="px-3 py-2 align-top text-xs text-slate-200">
                          {formatCrores(row.assets_worth)}
                        </td>
                        <td className="px-3 py-2 align-top text-xs text-slate-200">
                          <span className="font-medium text-emerald-300">
                            {row.votes_up}
                          </span>{" "}
                          <span className="text-slate-500">/</span>{" "}
                          <span className="font-medium text-red-300">
                            {row.votes_down}
                          </span>
                          <div className="text-[11px] text-slate-500">
                            {totalVotes === 0 ? "No votes yet" : `${totalVotes} votes`}
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <span className="inline-flex items-center rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-slate-100">
                            {row.score.toFixed(2)}
                          </span>
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
