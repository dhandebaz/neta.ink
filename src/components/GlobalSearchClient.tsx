"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type SearchResult = {
  id: number;
  slug: string | null;
  name: string;
  party: string | null;
  photoUrl: string | null;
  constituencyName: string | null;
};

function useDebounce<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(handle);
  }, [value, delayMs]);

  return debounced;
}

export default function GlobalSearchClient() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 250);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [keyLabel, setKeyLabel] = useState<{ mod: string; key: string }>({
    mod: "Ctrl",
    key: "K"
  });

  const trimmed = useMemo(() => debouncedQuery.trim(), [debouncedQuery]);

  useEffect(() => {
    async function run() {
      if (trimmed.length < 2) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          cache: "no-store"
        });
        const json = (await res.json().catch(() => null)) as
          | { success: true; data: SearchResult[] }
          | { success: false; error: string; data?: SearchResult[] }
          | null;

        if (!res.ok || !json || !json.success) {
          setResults([]);
          return;
        }

        setResults(Array.isArray(json.data) ? json.data : []);
      } finally {
        setLoading(false);
      }
    }

    void run();
  }, [trimmed]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
      if (e.key === "Enter" && open && results.length > 0) {
        const first = results[0];
        const href = `/politician/${first.slug || first.id}`;
        setOpen(false);
        router.push(href);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, results, router]);

  useEffect(() => {
    function onPointerDown(e: MouseEvent | TouchEvent) {
      const target = e.target as Node | null;
      if (!target) return;
      if (!containerRef.current) return;
      if (!containerRef.current.contains(target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, []);

  useEffect(() => {
    const platform =
      typeof navigator !== "undefined" && typeof navigator.platform === "string"
        ? navigator.platform.toLowerCase()
        : "";
    if (platform.includes("mac")) {
      setKeyLabel({ mod: "⌘", key: "K" });
    }
  }, []);

  const showDropdown = open && (loading || results.length > 0 || trimmed.length >= 2);

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search politicians..."
          className="w-full rounded-full border border-slate-200 bg-white/70 py-2 pl-9 pr-14 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-amber-400 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-50 dark:placeholder:text-slate-500"
        />
        <div className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-full border border-slate-200 bg-white/70 px-2 py-1 text-[10px] font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-400 sm:flex">
          <span>{keyLabel.mod}</span>
          <span>{keyLabel.key}</span>
        </div>
      </div>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-950">
          {loading ? (
            <div className="p-4 text-sm text-slate-500 dark:text-slate-400">
              Searching…
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-sm text-slate-500 dark:text-slate-400">
              No matches.
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {results.map((item) => {
                const href = `/politician/${item.slug || item.id}`;
                const avatar =
                  item.photoUrl ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=random`;
                return (
                  <button
                    key={`${item.id}-${item.slug ?? ""}`}
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      router.push(href);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-900/60"
                  >
                    <div className="relative h-8 w-8 flex-shrink-0">
                      <Image
                        src={avatar}
                        alt={item.name}
                        fill
                        className="rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800"
                        sizes="32px"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">
                        {item.name}
                      </div>
                      <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {item.party ?? "—"}
                        {item.constituencyName ? ` · ${item.constituencyName}` : ""}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
