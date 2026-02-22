"use client";

import { useEffect, useState } from "react";

type DevStatus = {
  stateCodeDefault: string;
  flags: Record<string, string | null>;
  counts: {
    complaints: number;
    rtiRequests: number;
  };
};

function getEnv(name: string) {
  if (typeof process === "undefined" || !process.env) {
    return undefined;
  }
  return process.env[name];
}

const showOverlay =
  typeof process !== "undefined" &&
  getEnv("NEXT_PUBLIC_SHOW_DEV_OVERLAY") === "true" &&
  getEnv("NODE_ENV") !== "production";

export function DevOverlay() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<DevStatus | null>(null);

  useEffect(() => {
    if (!showOverlay) {
      return;
    }

    let cancelled = false;

    async function loadStatus() {
      try {
        const res = await fetch("/api/dev/status");

        if (!res.ok) {
          return;
        }

        const json = (await res.json()) as { success: boolean; data?: DevStatus | null };

        if (!json.success || !json.data || cancelled) {
          return;
        }

        setStatus(json.data);
      } catch {
      }
    }

    void loadStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!showOverlay || !status) {
    return null;
  }

  const summary = `State: ${status.stateCodeDefault} · complaints=${status.counts.complaints} · rtis=${status.counts.rtiRequests}`;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center">
      <div className="mb-3 w-full max-w-md px-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-full bg-slate-900/90 px-3 py-2 text-[11px] font-medium text-slate-100 shadow-lg shadow-slate-900/60 ring-1 ring-slate-700"
        >
          <span>Dev overlay</span>
          <span className="truncate text-[10px] text-slate-300">{summary}</span>
        </button>
        {open && (
          <div className="mt-2 rounded-2xl bg-slate-900/95 p-3 text-[11px] text-slate-100 shadow-lg shadow-slate-900/70 ring-1 ring-slate-700">
            <div className="mb-1 font-semibold">State</div>
            <div className="mb-2 text-slate-200">
              {status.stateCodeDefault === "DL" ? "Delhi (DL)" : status.stateCodeDefault}
            </div>
            <div className="mb-1 font-semibold">Feature flags</div>
            <dl className="mb-2 grid grid-cols-2 gap-x-3 gap-y-1">
              {Object.entries(status.flags).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between gap-2">
                  <dt className="truncate text-slate-300">{key}</dt>
                  <dd className="text-right text-[10px] text-amber-200">
                    {value ?? "null"}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mb-1 font-semibold">Counts</div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-slate-200">
                <span>Complaints</span>
                <span className="text-amber-200">{status.counts.complaints}</span>
              </div>
              <div className="flex items-center justify-between text-slate-200">
                <span>RTI requests</span>
                <span className="text-amber-200">{status.counts.rtiRequests}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

