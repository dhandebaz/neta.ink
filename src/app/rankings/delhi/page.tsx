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
          <h1 className="text-3xl font-bold">Delhi Politicians – Worst to Best</h1>
          <p className="text-sm text-slate-600">
            All MLAs and MPs ranked by cases, assets and citizen votes.
          </p>
          <p className="text-xs text-slate-500">
            Ranking is an experimental composite score based on publicly declared cases, assets and platform votes.
          </p>
          <p className="text-xs">
            <Link href="/politicians/delhi" className="text-blue-600 hover:underline">
              View as raw list
            </Link>
          </p>
        </header>

        {rows.length === 0 ? (
          <p className="text-sm text-center text-slate-600">
            No Delhi politicians found in the database yet.
          </p>
        ) : (
          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left">Rank</th>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Position</th>
                  <th className="px-3 py-2 text-left">Constituency</th>
                  <th className="px-3 py-2 text-left">Party</th>
                  <th className="px-3 py-2 text-left">Criminal cases</th>
                  <th className="px-3 py-2 text-left">Assets (₹ crore)</th>
                  <th className="px-3 py-2 text-left">Votes (up/down)</th>
                  <th className="px-3 py-2 text-left">Score (0–5)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={row.id}
                    className={index % 2 === 0 ? "bg-white" : "bg-slate-50/60"}
                  >
                    <td className="px-3 py-2 align-top">{index + 1}</td>
                    <td className="px-3 py-2 align-top font-medium">
                      <a
                        href={`/politician/${row.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {row.name}
                      </a>
                    </td>
                    <td className="px-3 py-2 align-top">{row.position}</td>
                    <td className="px-3 py-2 align-top">
                      {row.constituencyName ?? "—"}
                    </td>
                    <td className="px-3 py-2 align-top">{row.party ?? "—"}</td>
                    <td className="px-3 py-2 align-top">{row.criminal_cases}</td>
                    <td className="px-3 py-2 align-top">
                      {formatCrores(row.assets_worth)}
                    </td>
                    <td className="px-3 py-2 align-top">
                      {row.votes_up} / {row.votes_down}
                    </td>
                    <td className="px-3 py-2 align-top">{row.score.toFixed(2)}</td>
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
