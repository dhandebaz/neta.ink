"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Search,
  Filter,
  LayoutGrid,
  List,
  ChevronDown,
  AlertTriangle,
  GraduationCap,
  Users,
  IndianRupee,
  Scale,
  X,
  ArrowUpDown,
} from "lucide-react";

type Politician = {
  id: number;
  name: string;
  slug: string;
  position: string;
  party: string | null;
  photo_url: string | null;
  criminal_cases: number;
  assets_worth: string;
  liabilities: string;
  education: string | null;
  age: number | null;
  rating: number;
  votes_up: number;
  votes_down: number;
  myneta_url: string | null;
  constituency_name: string | null;
  constituency_type: string | null;
};

type Stats = {
  total: number;
  withCriminalCases: number;
  totalCriminalCases: number;
  avgAge: number;
  partyBreakdown: { party: string; count: number }[];
};

type AvailableState = { code: string; name: string };

const PARTY_COLORS: Record<string, string> = {
  BJP: "#FF6B00",
  AAP: "#0AAB35",
  INC: "#19AAED",
  BSP: "#2260A9",
  SP: "#FF2222",
  JDU: "#003D1B",
  TMC: "#20C646",
  DMK: "#E41F28",
  YSRCP: "#1569C7",
  Independent: "#6B7280",
};

type SortKey = "name" | "criminal_cases" | "assets" | "age";

export function TrackerClient() {
  const [politicians, setPoliticians] = useState<Politician[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [availableStates, setAvailableStates] = useState<AvailableState[]>([]);
  const [stateCode, setStateCode] = useState("DL");
  const [stateName, setStateName] = useState("Delhi");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [partyFilter, setPartyFilter] = useState<string | null>(null);
  const [criminalFilter, setCriminalFilter] = useState<"all" | "yes" | "no">("all");
  const [positionFilter, setPositionFilter] = useState<"all" | "MLA" | "MP">("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [showFilters, setShowFilters] = useState(false);

  const fetchData = useCallback(async (code: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tracker/politicians?state=${code}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load");
      setPoliticians(json.data);
      setStats(json.stats);
      setStateName(json.state.name);
      if (json.availableStates?.length > 0) {
        setAvailableStates(json.availableStates);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(stateCode);
  }, [stateCode, fetchData]);

  const filtered = useMemo(() => {
    let result = [...politicians];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.party?.toLowerCase().includes(q)) ||
          (p.constituency_name?.toLowerCase().includes(q))
      );
    }

    if (partyFilter) {
      result = result.filter((p) => p.party === partyFilter);
    }

    if (criminalFilter === "yes") {
      result = result.filter((p) => p.criminal_cases > 0);
    } else if (criminalFilter === "no") {
      result = result.filter((p) => p.criminal_cases === 0);
    }

    if (positionFilter !== "all") {
      result = result.filter((p) => p.position === positionFilter);
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "criminal_cases":
          cmp = (a.criminal_cases ?? 0) - (b.criminal_cases ?? 0);
          break;
        case "assets":
          cmp = Number(BigInt(a.assets_worth) - BigInt(b.assets_worth));
          break;
        case "age":
          cmp = (a.age ?? 0) - (b.age ?? 0);
          break;
      }
      return sortAsc ? cmp : -cmp;
    });

    return result;
  }, [politicians, search, partyFilter, criminalFilter, positionFilter, sortKey, sortAsc]);

  const parties = useMemo(() => {
    const set = new Set<string>();
    politicians.forEach((p) => {
      if (p.party) set.add(p.party);
    });
    return Array.from(set).sort();
  }, [politicians]);

  function formatCrores(raw: string): string {
    const cr = Number(raw) / 10_000_000;
    if (cr >= 100) return `${Math.round(cr)} Cr`;
    if (cr >= 1) return `${cr.toFixed(1)} Cr`;
    const lakh = Number(raw) / 100_000;
    if (lakh >= 1) return `${lakh.toFixed(1)} L`;
    return `₹${Number(raw).toLocaleString("en-IN")}`;
  }

  function getPartyColor(party: string | null): string {
    return PARTY_COLORS[party ?? ""] ?? "#6B7280";
  }

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === "name");
    }
  };

  const clearFilters = () => {
    setSearch("");
    setPartyFilter(null);
    setCriminalFilter("all");
    setPositionFilter("all");
    setSortKey("name");
    setSortAsc(true);
  };

  const hasActiveFilters =
    search || partyFilter || criminalFilter !== "all" || positionFilter !== "all";

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
              Politician Tracker
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Live data on every elected representative.{" "}
              <span className="text-slate-400 dark:text-slate-500">
                Sources: MyNeta.info, ADR, ECI
              </span>
            </p>
          </div>

          {/* State selector */}
          {availableStates.length > 1 && (
            <div className="relative">
              <select
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value)}
                className="appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-10 text-sm font-medium text-slate-900 shadow-sm transition-colors hover:border-slate-300 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 dark:hover:border-slate-600"
              >
                {availableStates.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          )}
        </div>
      </header>

      {/* Stats bar */}
      {stats && !loading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Users className="h-3.5 w-3.5" />
              Total
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-50">
              {stats.total}
            </div>
            <div className="text-xs text-slate-500">{stateName}</div>
          </div>
          <div className="rounded-xl border border-red-100 bg-red-50/50 p-4 dark:border-red-900/30 dark:bg-red-950/20">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-red-600 dark:text-red-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              Criminal Cases
            </div>
            <div className="mt-1 text-2xl font-bold text-red-700 dark:text-red-400">
              {stats.withCriminalCases}
            </div>
            <div className="text-xs text-red-500 dark:text-red-500/70">
              {stats.totalCriminalCases} total cases
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <GraduationCap className="h-3.5 w-3.5" />
              Avg Age
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-50">
              {stats.avgAge}
            </div>
            <div className="text-xs text-slate-500">years</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Scale className="h-3.5 w-3.5" />
              Parties
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-50">
              {stats.partyBreakdown.length}
            </div>
            <div className="text-xs text-slate-500">represented</div>
          </div>
        </div>
      )}

      {/* Party breakdown chips */}
      {stats && !loading && (
        <div className="flex flex-wrap gap-2">
          {stats.partyBreakdown.map(({ party, count }) => (
            <button
              key={party}
              onClick={() =>
                setPartyFilter(partyFilter === party ? null : party)
              }
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                partyFilter === party
                  ? "border-transparent text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600"
              }`}
              style={
                partyFilter === party
                  ? { backgroundColor: getPartyColor(party) }
                  : {}
              }
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: getPartyColor(party) }}
              />
              {party} ({count})
            </button>
          ))}
        </div>
      )}

      {/* Search & Filters bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, party, or constituency..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 dark:placeholder:text-slate-500"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
              showFilters || hasActiveFilters
                ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-500/50 dark:bg-emerald-500/10 dark:text-emerald-400"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            }`}
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                {[search, partyFilter, criminalFilter !== "all", positionFilter !== "all"].filter(Boolean).length}
              </span>
            )}
          </button>

          <div className="hidden items-center rounded-xl border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900 sm:flex">
            <button
              onClick={() => setViewMode("grid")}
              className={`rounded-lg p-2 transition-colors ${
                viewMode === "grid"
                  ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-50"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`rounded-lg p-2 transition-colors ${
                viewMode === "table"
                  ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-50"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                Position
              </label>
              <div className="flex gap-1">
                {(["all", "MLA", "MP"] as const).map((val) => (
                  <button
                    key={val}
                    onClick={() => setPositionFilter(val)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      positionFilter === val
                        ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                    }`}
                  >
                    {val === "all" ? "All" : val}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                Criminal Cases
              </label>
              <div className="flex gap-1">
                {(["all", "yes", "no"] as const).map((val) => (
                  <button
                    key={val}
                    onClick={() => setCriminalFilter(val)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      criminalFilter === val
                        ? val === "yes"
                          ? "bg-red-600 text-white"
                          : "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                    }`}
                  >
                    {val === "all" ? "All" : val === "yes" ? "Has cases" : "Clean"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                Sort by
              </label>
              <div className="flex gap-1">
                {([
                  { key: "name", label: "Name" },
                  { key: "criminal_cases", label: "Cases" },
                  { key: "assets", label: "Assets" },
                  { key: "age", label: "Age" },
                ] as { key: SortKey; label: string }[]).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => toggleSort(key)}
                    className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      sortKey === key
                        ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                    }`}
                  >
                    {label}
                    {sortKey === key && (
                      <ArrowUpDown className="h-3 w-3" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      )}

      {/* Results count */}
      {!loading && (
        <div className="text-sm text-slate-500 dark:text-slate-400">
          Showing {filtered.length} of {politicians.length} politicians
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/50"
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-slate-200 dark:bg-slate-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-3 w-24 rounded bg-slate-100 dark:bg-slate-800" />
                </div>
              </div>
              <div className="mt-4 flex gap-4 border-t border-slate-100 pt-3 dark:border-slate-800">
                <div className="h-3 w-16 rounded bg-slate-100 dark:bg-slate-800" />
                <div className="h-3 w-16 rounded bg-slate-100 dark:bg-slate-800" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/30 dark:bg-red-950/20">
          <AlertTriangle className="mx-auto h-8 w-8 text-red-400" />
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={() => fetchData(stateCode)}
            className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Grid view */}
      {!loading && !error && viewMode === "grid" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Link
              key={p.id}
              href={`/politician/${p.slug || p.id}`}
              className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-slate-700"
            >
              {/* Party color accent */}
              <div
                className="absolute left-0 top-0 h-full w-1 rounded-l-xl"
                style={{ backgroundColor: getPartyColor(p.party) }}
              />

              <div className="flex items-start justify-between gap-3 pl-2">
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 flex-shrink-0">
                    <Image
                      src={
                        p.photo_url ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random&color=fff&size=256`
                      }
                      alt={p.name}
                      fill
                      className="rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800"
                      sizes="48px"
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-slate-900 transition-colors group-hover:text-emerald-600 dark:text-slate-100 dark:group-hover:text-emerald-400">
                      {p.name}
                    </h3>
                    <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                      <span
                        className="font-medium"
                        style={{ color: getPartyColor(p.party) }}
                      >
                        {p.party}
                      </span>
                      {" · "}
                      {p.constituency_name}
                    </p>
                  </div>
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

              <div className="mt-4 flex items-center gap-4 border-t border-slate-100 pl-2 pt-3 text-xs text-slate-500 dark:border-slate-800/50 dark:text-slate-400">
                <div>
                  <span
                    className={`block font-medium ${
                      p.criminal_cases > 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-slate-900 dark:text-slate-200"
                    }`}
                  >
                    {p.criminal_cases}
                  </span>
                  Cases
                </div>
                <div>
                  <span className="block font-medium text-slate-900 dark:text-slate-200">
                    ₹{formatCrores(p.assets_worth)}
                  </span>
                  Assets
                </div>
                {p.age && (
                  <div>
                    <span className="block font-medium text-slate-900 dark:text-slate-200">
                      {p.age}
                    </span>
                    Age
                  </div>
                )}
                {p.education && (
                  <div className="hidden sm:block">
                    <span className="block truncate font-medium text-slate-900 dark:text-slate-200" style={{ maxWidth: "80px" }}>
                      {p.education}
                    </span>
                    Education
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Table view */}
      {!loading && !error && viewMode === "table" && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/50">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">
                  <button onClick={() => toggleSort("name")} className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-200">
                    Name {sortKey === "name" && <ArrowUpDown className="h-3 w-3" />}
                  </button>
                </th>
                <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Party</th>
                <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Constituency</th>
                <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">
                  <button onClick={() => toggleSort("criminal_cases")} className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-200">
                    Cases {sortKey === "criminal_cases" && <ArrowUpDown className="h-3 w-3" />}
                  </button>
                </th>
                <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">
                  <button onClick={() => toggleSort("assets")} className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-200">
                    Assets {sortKey === "assets" && <ArrowUpDown className="h-3 w-3" />}
                  </button>
                </th>
                <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">
                  <button onClick={() => toggleSort("age")} className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-200">
                    Age {sortKey === "age" && <ArrowUpDown className="h-3 w-3" />}
                  </button>
                </th>
                <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Education</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-slate-50 transition-colors hover:bg-slate-50 dark:border-slate-800/50 dark:hover:bg-slate-800/30"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/politician/${p.slug || p.id}`}
                      className="inline-flex items-center gap-2 font-medium text-slate-900 hover:text-emerald-600 dark:text-slate-100 dark:hover:text-emerald-400"
                    >
                      <div className="relative h-8 w-8 flex-shrink-0">
                        <Image
                          src={
                            p.photo_url ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random&color=fff&size=128`
                          }
                          alt={p.name}
                          fill
                          className="rounded-full object-cover"
                          sizes="32px"
                        />
                      </div>
                      {p.name}
                      <span
                        className={`text-[10px] font-medium uppercase ${
                          p.position === "MP" ? "text-indigo-600 dark:text-indigo-400" : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {p.position}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: getPartyColor(p.party) }}
                      />
                      {p.party}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {p.constituency_name}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-medium ${
                        p.criminal_cases > 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {p.criminal_cases}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                    ₹{formatCrores(p.assets_worth)}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {p.age ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {p.education ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900/50">
          <Search className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            No politicians match your filters.
          </p>
          <button
            onClick={clearFilters}
            className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
