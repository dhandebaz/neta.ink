"use client";

import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import { openRazorpayCheckout } from "@/lib/payments/razorpayClient";

type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; data?: any };

type DraftResult = {
  rti_text: string;
  pio_name: string | null;
  pio_address: string | null;
  filing_instructions: string[];
};

type RtiSummary = {
  id: number;
  question: string;
  status: string;
  created_at: string;
  portal_url: string | null;
  pio_name: string | null;
  rti_text?: string | null;
  pio_address?: string | null;
};

type TargetType = "MP" | "MLA" | "DEPT";

type TargetPoliticianSummary = {
  id: number;
  name: string;
  position: string;
  constituencyName: string | null;
};

type CurrentUserSummary = {
  id: number;
  name: string | null;
  state_code: string;
};

type Props = {
  initialTargetType?: TargetType;
  initialTargetId?: number;
  initialPoliticianSummary?: TargetPoliticianSummary;
  rtiEnabled?: boolean;
  aiRtiEnabled?: boolean;
  stateDisplayName?: string;
};

export function RtiClient({
  initialTargetType,
  initialTargetId,
  initialPoliticianSummary,
  rtiEnabled,
  aiRtiEnabled,
  stateDisplayName
}: Props) {
  const [targetType, setTargetType] = useState<TargetType>(
    initialTargetType ?? "DEPT"
  );
  const [targetIdInput, setTargetIdInput] = useState(
    initialTargetId ? String(initialTargetId) : ""
  );
  const [question, setQuestion] = useState("");

  const [draft, setDraft] = useState<DraftResult | null>(null);
  const [rtiText, setRtiText] = useState("");

  const [generating, setGenerating] = useState(false);
  const [creating, setCreating] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [myRtis, setMyRtis] = useState<RtiSummary[]>([]);
  const [myLoading, setMyLoading] = useState(false);

  const [selectedRti, setSelectedRti] = useState<RtiSummary | null>(null);
  const [user, setUser] = useState<CurrentUserSummary | null>(null);

  const canUseAiDraft = aiRtiEnabled !== false;
  const stateNameLabel = stateDisplayName || "your state";

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" as any });
        if (!res.ok) {
          setUser(null);
          return;
        }
        const json = (await res.json()) as {
          success: boolean;
          user?: CurrentUserSummary;
        };
        if (json.success && json.user) {
          setUser(json.user);
          void loadMyRtis();
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
    }
    void loadUser();
  }, []);

  async function loadMyRtis() {
    setMyLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/rti/mine");
      const json = (await res.json()) as ApiResponse<RtiSummary[]>;

      if (!res.ok || !json.success) {
        const message =
          "error" in json && typeof json.error === "string"
            ? json.error
            : "Failed to load your RTIs";
        setError(message);
      } else {
        setMyRtis(json.data);
      }
    } catch {
      setError("Network error while loading your RTIs.");
    } finally {
      setMyLoading(false);
    }
  }

  function parseTargetId(): number | undefined {
    const trimmed = targetIdInput.trim();
    if (!trimmed) return undefined;
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n <= 0) return undefined;
    return n;
  }

  async function handleGenerateDraft() {
    setError(null);
    setMessage(null);

    if (!canUseAiDraft) {
      setError(
        "Automatic drafting is currently unavailable. You can still write your RTI manually."
      );
      return;
    }

    if (!question.trim()) {
      setError("Please type your RTI question or information sought.");
      return;
    }

    const payload: {
      targetType: TargetType;
      targetId?: number;
      question: string;
    } = {
      targetType,
      question: question.trim()
    };

    const parsedId = parseTargetId();
    if ((targetType === "MP" || targetType === "MLA") && parsedId) {
      payload.targetId = parsedId;
    }

    setGenerating(true);

    try {
      const res = await fetch("/api/rti/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const json = (await res.json()) as ApiResponse<DraftResult>;

      if (!res.ok || !json.success) {
        const message =
          "error" in json && typeof json.error === "string"
            ? json.error
            : "Failed to generate RTI draft";
        setError(message);
      } else {
        setDraft(json.data);
        setRtiText(json.data.rti_text);
        setMessage("RTI draft generated. Review and edit before saving.");
      }
    } catch {
      setError("Network error while generating RTI draft.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleCreate() {
    setError(null);
    setMessage(null);

    if (!question.trim()) {
      setError("Please fill in the RTI question or summary.");
      return;
    }

    if (!rtiText.trim()) {
      setError("RTI text is required. Write the full RTI body before saving.");
      return;
    }

    if (!user) {
      setError("Sign in before saving an RTI.");
      return;
    }

    const parsedId = parseTargetId();
    const politicianId =
      targetType === "MP" || targetType === "MLA" ? parsedId : undefined;

    const payload = {
      politicianId,
      question: question.trim(),
      rtiText: rtiText.trim(),
      pioName: draft?.pio_name ?? undefined,
      pioAddress: draft?.pio_address ?? undefined
    };

    setCreating(true);

    try {
      const res = await fetch("/api/rti/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const json = (await res.json()) as ApiResponse<{
        rti_request_id: number;
        payment_id: number;
        razorpay_order: { id: string; amount: number; currency: string };
      }>;

      if (!res.ok || !json.success) {
        const message =
          "error" in json && typeof json.error === "string"
            ? json.error
            : "Failed to save RTI and create payment";
        setError(message);
      } else {
        const order = json.data.razorpay_order;

        const result = await openRazorpayCheckout({
          order,
          notes: {
            task_type: "rti_drafting",
            rti_request_id: String(json.data.rti_request_id)
          }
        });

        if (result.status === "success") {
          try {
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: order.id,
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
              setMessage("Payment successful. Your RTI request has been saved.");
              setQuestion("");
              setDraft(null);
              setRtiText("");
              void loadMyRtis();
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
          setMessage(
            "Checkout closed. You can retry payment for this RTI from your history later."
          );
        } else {
          setError("Payment could not be completed. You can retry later from your RTIs.");
        }
      }
    } catch {
      setError("Network error while saving RTI.");
    } finally {
      setCreating(false);
    }
  }

  function handleDownloadPdf() {
    if (!rtiText.trim()) {
      setError("Generate an RTI draft before downloading a PDF.");
      return;
    }

    const doc = new jsPDF();
    doc.setFont("times", "normal");
    doc.setFontSize(12);
    const lines = doc.splitTextToSize(rtiText.trim(), 180);
    doc.text(lines, 15, 20);
    doc.save("rti-draft.pdf");
  }

  return (
    <div className="space-y-8 text-left">
      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-100">
          {error}
        </div>
      )}
      {message && !error && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
          {message}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80">
        <div className="flex flex-col gap-2 border-b border-slate-200 dark:border-slate-800/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-300">
              Draft a new RTI
            </div>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              Describe what you want to ask under RTI. neta can help draft, but you always control the final text.
            </p>
          </div>
          {user && (
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Signed in as user #{user.id} ({user.state_code})
            </div>
          )}
        </div>

        <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
          <div className="grid gap-4 md:grid-cols-[1fr,2fr]">
            <div className="space-y-3">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-200">
                Target type
                <select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value as TargetType)}
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-amber-400"
                >
                  <option value="DEPT">State department / PIO</option>
                  <option value="MLA">MLA (State Assembly)</option>
                  <option value="MP">MP (Lok Sabha)</option>
                </select>
              </label>
              {(targetType === "MP" || targetType === "MLA") && (
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-200">
                  Target politician ID
                  <input
                    type="text"
                    value={targetIdInput}
                    onChange={(e) => setTargetIdInput(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-amber-400"
                    placeholder="Internal politician_id (numeric)"
                  />
                </label>
              )}
              {initialPoliticianSummary && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 p-3 text-xs space-y-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    Target representative
                  </div>
                  <div className="text-xs text-slate-700 dark:text-slate-200">
                    {initialPoliticianSummary.name} · {initialPoliticianSummary.position}
                    {initialPoliticianSummary.constituencyName
                      ? ` · ${initialPoliticianSummary.constituencyName}`
                      : ""}
                  </div>
                  <div className="text-[11px]">
                    <a
                      href={`/politician/${initialPoliticianSummary.id}`}
                      className="text-amber-600 dark:text-amber-300 hover:text-amber-500 dark:hover:text-amber-200"
                    >
                      View profile
                    </a>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-200">
                RTI question / information sought
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="mt-1 w-full min-h-[96px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-amber-400"
                  placeholder="Describe clearly what information you want under RTI."
                />
              </label>
              {!canUseAiDraft && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Automatic drafting is currently unavailable. You can still write and submit your
                  RTI manually.
                </p>
              )}
            </div>
          </div>

          {canUseAiDraft && (
            <button
              type="button"
              onClick={() => void handleGenerateDraft()}
              className="inline-flex items-center justify-center rounded-full bg-amber-400 px-4 py-2 text-sm font-medium text-slate-950 shadow-sm hover:bg-amber-300 disabled:opacity-60"
              disabled={generating}
            >
              {generating ? "Generating draft..." : "Generate RTI draft"}
            </button>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80">
        <div className="border-b border-slate-200 dark:border-slate-800/80 px-4 py-3 sm:px-5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
            RTI text
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Write or edit the full RTI body that will be saved. AI drafts, when available, appear here.
          </p>
        </div>

        <div className="grid gap-4 border-t border-slate-200 dark:border-slate-800/80 px-4 py-4 sm:grid-cols-[2fr,1fr] sm:px-5 sm:py-5">
          <div className="space-y-3">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-200">
              RTI body
              <textarea
                value={rtiText}
                onChange={(e) => setRtiText(e.target.value)}
                className="mt-1 w-full min-h-[220px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-amber-400"
                placeholder="Write the full RTI application text that you want to file."
              />
            </label>
          </div>
          <div className="space-y-3 text-xs text-slate-700 dark:text-slate-200">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                PIO name
              </div>
              <div className="mt-1 text-xs text-slate-700 dark:text-slate-200">
                {draft?.pio_name || "Not specified"}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                PIO address
              </div>
              <div className="mt-1 whitespace-pre-line text-xs text-slate-700 dark:text-slate-200">
                {draft?.pio_address || "Not specified"}
              </div>
            </div>
            {draft && draft.filing_instructions.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Filing instructions
                </div>
                <ul className="mt-1 list-disc list-inside space-y-1 text-xs text-slate-600 dark:text-slate-300">
                  {draft.filing_instructions.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 border-t border-slate-200 dark:border-slate-800/80 px-4 py-3 sm:px-5">
          {rtiEnabled !== false && (
            <button
              type="button"
              onClick={() => void handleCreate()}
              className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 shadow-sm hover:bg-emerald-400 disabled:opacity-60"
              disabled={creating}
            >
              {creating ? "Saving draft and creating payment..." : "Pay ₹11 & save RTI"}
            </button>
          )}
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="inline-flex items-center justify-center rounded-full border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-100 hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-200"
          >
            Download RTI PDF
          </button>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80 px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              My RTIs
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              View the RTIs you have drafted and track their status.
            </p>
          </div>
        </div>
        {myLoading && (
          <p className="text-xs text-slate-500 dark:text-slate-400">Loading your RTI history…</p>
        )}
        {!myLoading && myRtis.length === 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-500">
            You have not drafted any RTIs yet.
          </p>
        )}
        <div className="space-y-3">
          {myRtis.map((rti) => (
            <article
              key={rti.id}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/90 p-3 text-xs text-slate-700 dark:text-slate-200"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-50 line-clamp-2">
                    {rti.question}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    {new Date(rti.created_at).toLocaleString()}
                  </div>
                </div>
                <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-700 dark:text-amber-200">
                  {rti.status}
                </span>
              </div>
              {rti.portal_url && (
                <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Suggested portal: {rti.portal_url}
                </div>
              )}
              {rti.pio_name && (
                <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  PIO: {rti.pio_name}
                </div>
              )}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedRti(rti)}
                  className="inline-flex items-center rounded-full border border-slate-300 dark:border-slate-700 px-3 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-100 hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-200"
                >
                  View full RTI
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {selectedRti && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 dark:bg-black/70 px-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-4 text-slate-900 dark:text-slate-50">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">
                  {selectedRti.question}
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {new Date(selectedRti.created_at).toLocaleString()} · Status:{" "}
                  {selectedRti.status}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRti(null)}
                className="ml-2 inline-flex items-center justify-center rounded-full border border-slate-300 dark:border-slate-600 px-2 py-1 text-[11px] hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-200"
              >
                Close
              </button>
            </div>
            <div className="mt-3 space-y-3 text-sm">
              {selectedRti.portal_url && (
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Suggested portal: {selectedRti.portal_url}
                </div>
              )}
              {selectedRti.pio_name && (
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  PIO: {selectedRti.pio_name}
                </div>
              )}
              {selectedRti.pio_address && (
                <div className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-pre-line">
                  PIO address: {selectedRti.pio_address}
                </div>
              )}
              {selectedRti.rti_text && (
                <div className="mt-2 whitespace-pre-line text-sm text-slate-800 dark:text-slate-100">
                  {selectedRti.rti_text}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
