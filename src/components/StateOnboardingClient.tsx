"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { INDIAN_STATES } from "@/lib/states";

type Props = {
  initialStateCode?: string | null;
  onClose?: () => void;
};

export function StateOnboardingClient(props: Props) {
  const [stateCode, setStateCode] = useState<string>(() => {
    const code = props.initialStateCode?.trim().toUpperCase();
    if (code && code.length === 2) {
      return code;
    }
    return "DL";
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const code = props.initialStateCode?.trim().toUpperCase();
    if (code && code.length === 2) {
      setStateCode(code);
    }
  }, [props.initialStateCode]);

  const close = () => {
    if (props.onClose) {
      props.onClose();
    }
  };

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    close();
  };

  const handleSave = async () => {
    setError(null);
    setMessage(null);

    const trimmed = stateCode.trim().toUpperCase();
    if (!trimmed || trimmed.length !== 2) {
      setError("Choose a state or union territory.");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/auth/me", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ stateCode: trimmed })
      });

      const json = (await res.json().catch(() => null)) as
        | {
            success?: boolean;
            error?: string;
          }
        | null;

      if (!res.ok || !json || json.success !== true) {
        const message =
          json && typeof json.error === "string" && json.error.length > 0
            ? json.error
            : "Could not save your state. Please try again.";
        setError(message);
        return;
      }

      setMessage("Saved your state preference.");

      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem("neta_state_onboarded", "1");
        } catch {
        }
        window.location.reload();
      }
    } catch {
      setError("Network error while saving your state.");
    } finally {
      setSaving(false);
    }
  };

  const liveCodes = new Set<string>(["DL"]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-950/95 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-100">Choose your state</div>
            <p className="mt-1 text-[11px] text-slate-400">
              This helps neta personalise RTIs and complaints for where you live.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 text-[11px] text-slate-300 hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <label className="block text-xs text-slate-300">
            State or Union Territory
            <select
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-400"
              value={stateCode}
              onChange={(e) => setStateCode(e.target.value)}
            >
              {INDIAN_STATES.map((state) => {
                const live = liveCodes.has(state.code);
                const label = live ? `${state.name} (live)` : state.name;
                return (
                  <option key={state.code} value={state.code}>
                    {label}
                  </option>
                );
              })}
            </select>
          </label>

          {error && (
            <p className="text-xs text-red-400">
              {error}
            </p>
          )}
          {message && !error && (
            <p className="text-xs text-emerald-300">
              {message}
            </p>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex w-full items-center justify-center rounded-full bg-amber-400 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-amber-300 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save state"}
          </button>
        </div>
      </div>
    </div>
  );
}

