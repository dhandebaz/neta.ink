"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type ComparePolitician = {
  id: number;
  name: string;
  slug: string;
  party: string | null;
  position: string | null;
  photoUrl: string | null;
  rating: number;
  criminalCases: number;
  assetsWorth: string;
  constituencyName: string | null;
};

type SearchResponse = {
  success: boolean;
  data?: ComparePolitician[];
};

function formatAssetsCrores(assetsWorth: string): string {
  if (!assetsWorth) return "₹ 0 Cr";
  let valueNumber = 0;
  try {
    const asBigInt = BigInt(assetsWorth);
    valueNumber = Number(asBigInt) / 10_000_000;
  } catch {
    const asNumber = Number(assetsWorth);
    if (Number.isFinite(asNumber)) {
      valueNumber = asNumber / 10_000_000;
    }
  }
  if (!Number.isFinite(valueNumber)) return "₹ 0 Cr";
  return `₹ ${valueNumber.toFixed(1)} Cr`;
}

export function CompareClient() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ComparePolitician[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedPoliticians, setSelectedPoliticians] = useState<ComparePolitician[]>([]);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!limitMessage) return;
    const timeout = setTimeout(() => {
      setLimitMessage(null);
    }, 2500);
    return () => clearTimeout(timeout);
  }, [limitMessage]);

  useEffect(() => {
    const trimmed = searchQuery.trim();

    if (trimmed.length < 2) {
      setSearchResults([]);
      setSearchError(null);
      setSearchLoading(false);
      return;
    }

    let cancelled = false;
    setSearchLoading(true);
    setSearchError(null);

    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/politicians/search?q=${encodeURIComponent(trimmed)}`
        );

        const json = (await res.json().catch(() => null)) as SearchResponse | null;

        if (cancelled) return;

        if (!res.ok || !json || !json.success || !json.data) {
          setSearchResults([]);
          setSearchError("Could not search representatives.");
          return;
        }

        setSearchResults(json.data);
      } catch {
        if (cancelled) return;
        setSearchResults([]);
        setSearchError("Could not search representatives.");
      } finally {
        if (!cancelled) {
          setSearchLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [searchQuery]);

  const handleSelect = (item: ComparePolitician) => {
    const alreadySelected = selectedPoliticians.some((p) => p.id === item.id);
    if (alreadySelected) {
      return;
    }
    if (selectedPoliticians.length >= 4) {
      setLimitMessage("You can only compare up to 4 representatives at a time.");
      return;
    }
    setSelectedPoliticians((prev) => [...prev, item]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleRemove = (id: number) => {
    setSelectedPoliticians((prev) => prev.filter((p) => p.id !== id));
  };

  const ratingSummary = useMemo(() => {
    if (selectedPoliticians.length === 0) return null;
    const ratings = selectedPoliticians.map((p) =>
      Number.isFinite(p.rating) ? p.rating : 0
    );
    const maxRating = Math.max(...ratings);
    if (!Number.isFinite(maxRating)) return null;
    return maxRating.toFixed(1);
  }, [selectedPoliticians]);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-900 dark:text-slate-100">
          Search for representatives to compare
        </label>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or party (min 2 characters)"
            className="w-full rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-amber-400"
          />
          {searchLoading && (
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-500 dark:text-slate-400">
              Searching…
            </div>
          )}
          {searchResults.length > 0 && (
            <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950/95 text-sm text-slate-900 dark:text-slate-100 shadow-lg">
              {searchResults.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelect(p)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-900/80"
                >
                  <div className="relative h-9 w-9 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    {p.photoUrl && (
                      <Image
                        src={p.photoUrl}
                        alt={p.name}
                        fill
                        sizes="36px"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-medium text-slate-900 dark:text-slate-50">
                      {p.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {p.party || "Party not specified"}
                      {p.position ? ` · ${p.position}` : ""}
                      {p.constituencyName ? ` · ${p.constituencyName}` : ""}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        {searchError && (
          <p className="text-xs text-red-500 dark:text-red-400">
            {searchError}
          </p>
        )}
        {limitMessage && (
          <p className="text-xs text-amber-600 dark:text-amber-300">
            {limitMessage}
          </p>
        )}
      </div>

      {selectedPoliticians.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 p-4 text-sm text-slate-600 dark:text-slate-300">
          Select up to four MPs or MLAs to compare their assets, cases, and citizen ratings side-by-side.
        </div>
      ) : (
        <div className="space-y-3">
          {ratingSummary && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 p-3 text-xs text-slate-600 dark:text-slate-300">
              Highest citizen rating in this comparison:{" "}
              <span className="font-semibold text-amber-600 dark:text-amber-300">
                {ratingSummary} / 5
              </span>
            </div>
          )}

          <div className="overflow-x-auto">
            <div className="min-w-[520px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 p-3 text-xs text-slate-900 dark:text-slate-100">
              <div className="flex border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="w-32 flex-shrink-0 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Representative
                </div>
                <div className="flex flex-1 gap-3">
                  {selectedPoliticians.map((p) => (
                    <div
                      key={p.id}
                      className="flex min-w-[120px] flex-1 flex-col items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-900/70 p-2"
                    >
                      <div className="relative h-16 w-16 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                        {p.photoUrl && (
                          <Image
                            src={p.photoUrl}
                            alt={p.name}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        )}
                      </div>
                      <div className="text-center text-[11px] font-semibold text-slate-900 dark:text-slate-50">
                        {p.name}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemove(p.id)}
                        className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-300"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex border-b border-slate-200 dark:border-slate-800 py-3">
                <div className="w-32 flex-shrink-0 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Party & position
                </div>
                <div className="flex flex-1 gap-3">
                  {selectedPoliticians.map((p) => (
                    <div key={p.id} className="min-w-[120px] flex-1">
                      <div className="text-[11px] text-slate-800 dark:text-slate-100">
                        {p.party || "Not specified"}
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        {p.position || "Role not specified"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex border-b border-slate-200 dark:border-slate-800 py-3">
                <div className="w-32 flex-shrink-0 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Constituency
                </div>
                <div className="flex flex-1 gap-3">
                  {selectedPoliticians.map((p) => (
                    <div key={p.id} className="min-w-[120px] flex-1">
                      <div className="text-[11px] text-slate-800 dark:text-slate-100">
                        {p.constituencyName || "Not specified"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex border-b border-slate-200 dark:border-slate-800 py-3">
                <div className="w-32 flex-shrink-0 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Citizen rating
                </div>
                <div className="flex flex-1 gap-3">
                  {selectedPoliticians.map((p) => {
                    const ratingValue = Number.isFinite(p.rating)
                      ? p.rating
                      : 0;
                    return (
                      <div key={p.id} className="min-w-[120px] flex-1">
                        <div className="text-[11px] text-slate-800 dark:text-slate-100">
                          ⭐ {ratingValue.toFixed(1)} / 5
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex border-b border-slate-200 dark:border-slate-800 py-3">
                <div className="w-32 flex-shrink-0 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Criminal cases
                </div>
                <div className="flex flex-1 gap-3">
                  {selectedPoliticians.map((p) => {
                    const cases = p.criminalCases ?? 0;
                    const isHighlighted = cases > 0;
                    const textClass = isHighlighted
                      ? "text-red-600 dark:text-red-300"
                      : "text-slate-800 dark:text-slate-100";
                    return (
                      <div key={p.id} className="min-w-[120px] flex-1">
                        <div className={`text-[11px] ${textClass}`}>
                          {cases} case{cases === 1 ? "" : "s"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex border-b border-slate-200 dark:border-slate-800 py-3">
                <div className="w-32 flex-shrink-0 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Declared assets
                </div>
                <div className="flex flex-1 gap-3">
                  {selectedPoliticians.map((p) => (
                    <div key={p.id} className="min-w-[120px] flex-1">
                      <div className="text-[11px] text-slate-800 dark:text-slate-100">
                        {formatAssetsCrores(p.assetsWorth)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex pt-3">
                <div className="w-32 flex-shrink-0 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Full profile
                </div>
                <div className="flex flex-1 gap-3">
                  {selectedPoliticians.map((p) => (
                    <div key={p.id} className="min-w-[120px] flex-1">
                      <Link
                        href={`/politician/${p.id}`}
                        className="inline-flex h-9 w-full items-center justify-center rounded-full bg-amber-400 px-3 text-[11px] font-medium text-slate-950 hover:bg-amber-300"
                      >
                        View profile
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

