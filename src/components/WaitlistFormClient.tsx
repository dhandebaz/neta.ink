"use client";

import { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";

type InactiveState = {
  code: string;
  name: string;
};

type Props = {
  inactiveStates: InactiveState[];
};

export function WaitlistFormClient({ inactiveStates }: Props) {
  const [selectedState, setSelectedState] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  if (inactiveStates.length === 0) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedState || !phone) {
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/waitlist/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stateCode: selectedState, phoneNumber: phone }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to join waitlist");
      }

      setStatus("success");
    } catch (err: any) {
      console.error("Waitlist error:", err);
      setStatus("error");
      setErrorMessage(err.message || "Something went wrong. Please try again.");
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
          Don&apos;t see your state?
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Join the waitlist. We&apos;ll text you when we launch in your region.
        </p>
      </div>

      {status === "success" ? (
        <div className="flex flex-col items-center justify-center space-y-3 rounded-xl bg-emerald-50 py-8 text-center dark:bg-emerald-900/10">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="font-medium text-slate-900 dark:text-slate-50">You&apos;re on the list!</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              We&apos;ll notify you as soon as we launch.
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-emerald-500"
            >
              <option value="" disabled>
                Select your state
              </option>
              {inactiveStates.map((state) => (
                <option key={state.code} value={state.code}>
                  {state.name}
                </option>
              ))}
            </select>

            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Your 10-digit phone number"
              required
              pattern="[0-9]{10}"
              maxLength={10}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-emerald-500"
            />
          </div>

          {status === "error" && (
            <p className="text-xs text-red-500 dark:text-red-400">{errorMessage}</p>
          )}

          <button
            type="submit"
            disabled={status === "loading" || !selectedState || !phone}
            className="flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            {status === "loading" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Notify Me"
            )}
          </button>
        </form>
      )}
    </div>
  );
}
