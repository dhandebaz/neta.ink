"use client";

import { useState } from "react";
import { INDIAN_STATES } from "@/lib/states";
import { DelhiSearchClient } from "./DelhiSearchClient";

type Props = {
  delhiReady: boolean;
  delhiStatusMessage: string | null;
  liveStateCodes: string[];
  initialStateCode?: string;
};

type WaitlistState = {
  loading: boolean;
  message: string | null;
  error: string | null;
};

export function HomeStateSearchClient({
  delhiReady,
  delhiStatusMessage,
  liveStateCodes,
  initialStateCode
}: Props) {
  const [selectedStateCode, setSelectedStateCode] = useState<string>(
    initialStateCode && initialStateCode.trim().length === 2
      ? initialStateCode.trim().toUpperCase()
      : "DL"
  );
  const [contact, setContact] = useState("");
  const [waitlistState, setWaitlistState] = useState<WaitlistState>({
    loading: false,
    message: null,
    error: null
  });

  const selectedState =
    INDIAN_STATES.find((s) => s.code === selectedStateCode) ?? INDIAN_STATES[0];

  const isDelhi = selectedState.code === "DL";
  const isLive = liveStateCodes.includes(selectedState.code);

  async function submitWaitlist() {
    setWaitlistState({ loading: true, message: null, error: null });

    const trimmed = contact.trim();

    if (!trimmed) {
      setWaitlistState({
        loading: false,
        message: null,
        error: "Enter an email or phone number to join the waitlist."
      });
      return;
    }

    try {
      const res = await fetch("/api/waitlist/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stateCode: selectedState.code,
          stateName: selectedState.name,
          contact: trimmed,
          source: "home_state_waitlist"
        })
      });

      const json = (await res.json().catch(() => null)) as
        | { success: true; message: string }
        | { success?: false; error?: string }
        | null;

      if (!res.ok || !json || json.success !== true) {
        const message =
          json && "error" in json && typeof json.error === "string"
            ? json.error
            : "Failed to join waitlist. Please try again.";
        setWaitlistState({ loading: false, message: null, error: message });
        return;
      }

      setWaitlistState({
        loading: false,
        message: "You are on the waitlist. We will reach out as we go live.",
        error: null
      });
    } catch {
      setWaitlistState({
        loading: false,
        message: null,
        error: "Network error while joining the waitlist."
      });
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-50 sm:text-xl">
            Find your representative by state
          </h2>
          <p className="text-xs text-slate-300 sm:text-sm">
            India-wide design, with Delhi data live today. Pick your state to search or join the
            waitlist.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:w-64">
          <label className="text-xs font-medium text-slate-200">
            State or Union Territory
          </label>
          <select
            className="min-h-[44px] rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100"
            value={selectedStateCode}
            onChange={(e) => {
              setSelectedStateCode(e.target.value);
              setWaitlistState({ loading: false, message: null, error: null });
            }}
          >
            {INDIAN_STATES.map((state) => (
              <option key={state.code} value={state.code}>
                {state.name}
              </option>
            ))}
          </select>
          <div className="text-[11px] text-slate-400">
            {isLive ? "Status: Live" : "Status: Coming soon"}
          </div>
        </div>
      </div>

      {isDelhi ? (
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
            <span>Phase 1 live: Delhi</span>
          </div>
          {delhiReady ? (
            <DelhiSearchClient />
          ) : (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-amber-200">
              Delhi data is still being set up and will be available here soon.
              {delhiStatusMessage && (
                <div className="mt-2 text-[11px] text-amber-200/90">{delhiStatusMessage}</div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {isLive ? (
            <p className="text-xs text-slate-300 sm:text-sm">
              We are live in {selectedState.name} for browsing and discovery. Complaints and RTIs
              are being rolled out gradually and may not be available in every workflow yet.
            </p>
          ) : (
            <>
              <p className="text-xs text-slate-300 sm:text-sm">
                We&apos;re rolling out neta state-by-state. Select your state to join the waitlist
                and be notified when RTIs, complaints, and rankings go live for{" "}
                {selectedState.name}.
              </p>

              <div className="space-y-2 sm:flex sm:items-center sm:gap-3 sm:space-y-0">
                <input
                  type="text"
                  className="min-h-[44px] flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 placeholder:text-slate-500"
                  placeholder="Email or phone number"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => void submitWaitlist()}
                  className="mt-2 inline-flex min-h-[44px] items-center justify-center rounded-full bg-amber-400 px-4 text-sm font-medium text-slate-950 shadow hover:bg-amber-300 sm:mt-0"
                  disabled={waitlistState.loading}
                >
                  {waitlistState.loading
                    ? `Joining waitlist for ${selectedState.name}...`
                    : `Join waitlist for ${selectedState.name}`}
                </button>
              </div>

              {waitlistState.error && (
                <p className="text-xs text-red-400">{waitlistState.error}</p>
              )}
              {waitlistState.message && (
                <p className="text-xs text-emerald-300">{waitlistState.message}</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
