"use client";

import { useState } from "react";
import { openRazorpayCheckout } from "@/lib/payments/razorpayClient";

type Props = {
  apiLimit: number;
  apiCallsThisMonth: number;
  apiKey: string | null;
};

type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

type CreateOrderResult = {
  payment_id: number;
  razorpay_order: {
    id: string;
    amount: number;
    currency: string;
  };
};

export function DeveloperApiSection(props: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const used = props.apiCallsThisMonth;
  const limit = props.apiLimit;
  const hasPro = limit > 0;

  const usagePercent =
    limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  const handleCopy = () => {
    if (!props.apiKey) return;
    try {
      void navigator.clipboard.writeText(props.apiKey);
      setMessage("API key copied to clipboard.");
      setError(null);
    } catch {
      setError("Could not copy the API key. You can copy it manually.");
      setMessage(null);
    }
  };

  const handleUpgrade = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/payments/developer-api/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });

      const json = (await res.json().catch(() => null)) as
        | ApiResponse<CreateOrderResult>
        | null;

      if (!res.ok || !json || !json.success) {
        const message =
          json && !json.success && "error" in json
            ? json.error
            : "Could not start the payment. Please try again.";
        setError(message);
        return;
      }

      const { razorpay_order } = json.data;

      const result = await openRazorpayCheckout({
        order: razorpay_order,
        notes: {
          task_type: "developer_api_pro"
        }
      });

      if (result.status === "success") {
        try {
          const verifyRes = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: razorpay_order.id,
              razorpay_payment_id: result.paymentId,
              razorpay_signature: result.signature
            })
          });

          const verifyJson = (await verifyRes
            .json()
            .catch(() => null)) as
            | { success?: boolean; message?: string; error?: string }
            | null;

          if (verifyRes.ok && verifyJson && verifyJson.success) {
            setMessage(
              "Payment successful. Your Developer API access is now active."
            );
            setError(null);
            window.location.reload();
          } else {
            const message =
              verifyJson && verifyJson.error && typeof verifyJson.error === "string"
                ? verifyJson.error
                : "Payment verification failed. Please contact support.";
            setError(message);
          }
        } catch {
          setError("Payment verification failed. Please contact support.");
        }
      } else if (result.status === "dismissed") {
        setMessage("Checkout closed. You can upgrade to the API later.");
      } else {
        setError("Payment could not be completed. You can try again later.");
      }
    } catch {
      setError("Could not start the payment. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  if (!hasPro) {
    return (
      <section className="space-y-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <h2 className="text-base font-semibold text-slate-50">
            NetaInk Developer API
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            Get programmatic access to representative profiles, rankings, and live
            updates for your applications.
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Pro Tier: ₹10,000 per month for up to 100,000 API calls.
          </p>
          <button
            type="button"
            onClick={handleUpgrade}
            disabled={loading}
            className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-full bg-amber-400 px-4 text-sm font-semibold text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Starting checkout..." : "Upgrade to Pro (₹10,000/mo)"}
          </button>
          {message && (
            <p className="mt-2 text-xs text-emerald-400">
              {message}
            </p>
          )}
          {error && (
            <p className="mt-2 text-xs text-rose-400">
              {error}
            </p>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
        <h2 className="text-base font-semibold text-slate-50">
          Developer API access
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Use this key to call the NetaInk Developer API from your services.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <input
              type="text"
              readOnly
              value={props.apiKey ?? ""}
              className="w-full rounded-full border border-slate-800 bg-slate-900/70 px-4 py-2 text-xs text-slate-100 blur-sm hover:blur-0 focus-visible:blur-0"
            />
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex h-9 items-center justify-center rounded-full bg-slate-800 px-4 text-xs font-medium text-slate-100 hover:bg-slate-700"
          >
            Copy key
          </button>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              Usage this month
            </span>
            <span>
              {used.toLocaleString("en-IN")} / {limit.toLocaleString("en-IN")} calls
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${usagePercent}%` }}
            />
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-slate-900/60 p-3">
          <p className="text-xs font-medium text-slate-300">
            Quick start
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Example request to list politicians for Delhi:
          </p>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-950/80 p-3 text-[11px] text-slate-200">
{`curl -X GET "https://neta.ink/api/v1/politicians?state=DL&limit=10" \\
  -H "x-api-key: ${props.apiKey ?? "YOUR_API_KEY"}"`}
          </pre>
        </div>

        {message && (
          <p className="mt-2 text-xs text-emerald-400">
            {message}
          </p>
        )}
        {error && (
          <p className="mt-2 text-xs text-rose-400">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
