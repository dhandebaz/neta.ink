"use client";

import { useState } from "react";

type ApiResponse =
  | { success: true; data: any }
  | { success?: false; error: string; data?: null };

export function DelhiSearchClient() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    setError(null);
    setResult(null);

    const trimmed = query.trim();
    if (!trimmed) {
      setError("Please enter a Delhi Assembly constituency name.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/lookup/delhi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed })
      });

      const json = (await res.json()) as ApiResponse;

      if (!res.ok || !("success" in json) || json.success !== true) {
        const message =
          "error" in json && json.error ? json.error : "Lookup failed";
        setError(message);
      } else {
        setResult(json.data);
      }
    } catch {
      setError("Network error during lookup.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          className="min-h-[44px] flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          placeholder="Search by Delhi Assembly constituency (e.g. Chandni Chowk)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              void handleSearch();
            }
          }}
        />
        <button
          onClick={() => void handleSearch()}
          className="min-h-[44px] rounded-full bg-amber-400 px-4 text-sm font-medium text-slate-950 shadow hover:bg-amber-300 disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

      {result && (
        <div className="mt-4 space-y-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 p-4 text-left">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Constituency:{" "}
              <span className="font-normal text-slate-700 dark:text-slate-200">
                {result.constituencyName ?? "Not found"}
              </span>
            </h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <RepCard title="MLA" rep={result.mla} />
            <RepCard title="MP (Delhi)" rep={result.mp} />
          </div>
        </div>
      )}
    </div>
  );
}

function RepCard({ title, rep }: { title: string; rep: any | null }) {
  if (!rep) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3 text-xs text-slate-600 dark:text-slate-300">
        <div className="mb-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</div>
        <p>No representative data found yet for this constituency.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 p-3 text-xs">
      <div className="space-y-1">
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</div>
        <div className="text-sm font-medium text-slate-800 dark:text-slate-50">{rep.name}</div>
        <div className="text-slate-600 dark:text-slate-300">
          {rep.party ? `${rep.party}` : "Party unknown"}
        </div>
        <div className="text-slate-500 dark:text-slate-400">
          Criminal cases: {rep.criminal_cases ?? 0}
        </div>
        <div className="text-slate-500 dark:text-slate-400">
          Rating: {rep.rating ?? 0} / 5 ({rep.votes_up ?? 0} up,{" "}
          {rep.votes_down ?? 0} down)
        </div>
      </div>
      {typeof rep.id === "number" && (
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={`/politician/${rep.id}`}
            className="inline-flex min-h-[36px] flex-1 items-center justify-center rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-transparent px-3 text-[11px] font-medium text-slate-700 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            View profile
          </a>
          <a
            href={`/complaints?politicianId=${rep.id}`}
            className="inline-flex min-h-[36px] flex-1 items-center justify-center rounded-full bg-amber-400 px-3 text-[11px] font-medium text-slate-950 hover:bg-amber-300"
          >
            File complaint
          </a>
          <a
            href={`/rti?politicianId=${rep.id}&targetType=${encodeURIComponent(
              rep.position === "MP" || rep.position === "MLA" ? rep.position : "MLA"
            )}`}
            className="inline-flex min-h-[36px] flex-1 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-100 px-3 text-[11px] font-medium text-slate-900 hover:bg-slate-300 dark:hover:bg-slate-200"
          >
            Draft RTI
          </a>
        </div>
      )}
    </div>
  );
}
