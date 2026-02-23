"use client";

import { type Dispatch, type SetStateAction, useState } from "react";

type Props = {
  adminUserId: number;
  initialAiRtiEnabled: boolean;
  initialAiComplaintsEnabled: boolean;
};

type FlagState = {
  value: boolean;
  loading: boolean;
  error: string | null;
};

export function AiFlagsClient({
  adminUserId,
  initialAiRtiEnabled,
  initialAiComplaintsEnabled
}: Props) {
  const [rtiFlag, setRtiFlag] = useState<FlagState>({
    value: initialAiRtiEnabled,
    loading: false,
    error: null
  });

  const [complaintsFlag, setComplaintsFlag] = useState<FlagState>({
    value: initialAiComplaintsEnabled,
    loading: false,
    error: null
  });

  async function toggleFlag(
    key: "ai_rti_enabled_global" | "ai_complaints_enabled_global",
    nextValue: boolean,
    setState: Dispatch<SetStateAction<FlagState>>
  ) {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const res = await fetch("/api/admin/ai/flags", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-user-id": String(adminUserId)
        },
        body: JSON.stringify({ key, enabled: nextValue })
      });

      const json = (await res.json().catch(() => null)) as
        | { success: boolean; error?: string }
        | null;

      if (!res.ok || !json || !json.success) {
        const message =
          json && typeof json.error === "string" && json.error.length > 0
            ? json.error
            : `Request failed (${res.status})`;
        setState((prev) => ({ ...prev, loading: false, error: message }));
        return;
      }

      setState({ value: nextValue, loading: false, error: null });
    } catch {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: "Network error while updating AI flag"
      }));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
        <div className="space-y-1">
          <div className="text-sm font-medium">Enable AI for RTI drafting</div>
          <p className="text-xs text-slate-600">
            When off, citizens can still write and file RTIs manually.
          </p>
          {rtiFlag.error && (
            <p className="text-xs text-red-600">{rtiFlag.error}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() =>
            void toggleFlag(
              "ai_rti_enabled_global",
              !rtiFlag.value,
              setRtiFlag
            )
          }
          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${
            rtiFlag.value
              ? "border-emerald-500 bg-emerald-500/10 text-emerald-800"
              : "border-slate-400 bg-slate-100 text-slate-700"
          } ${rtiFlag.loading ? "opacity-60" : ""}`}
          disabled={rtiFlag.loading}
        >
          {rtiFlag.loading ? "Saving..." : rtiFlag.value ? "On" : "Off"}
        </button>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
        <div className="space-y-1">
          <div className="text-sm font-medium">Enable AI for complaint analysis</div>
          <p className="text-xs text-slate-600">
            When off, complaints rely on manual titles, departments, and descriptions.
          </p>
          {complaintsFlag.error && (
            <p className="text-xs text-red-600">{complaintsFlag.error}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() =>
            void toggleFlag(
              "ai_complaints_enabled_global",
              !complaintsFlag.value,
              setComplaintsFlag
            )
          }
          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${
            complaintsFlag.value
              ? "border-emerald-500 bg-emerald-500/10 text-emerald-800"
              : "border-slate-400 bg-slate-100 text-slate-700"
          } ${complaintsFlag.loading ? "opacity-60" : ""}`}
          disabled={complaintsFlag.loading}
        >
          {complaintsFlag.loading ? "Saving..." : complaintsFlag.value ? "On" : "Off"}
        </button>
      </div>
    </div>
  );
}
