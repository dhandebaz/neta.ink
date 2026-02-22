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
};

export function RtiClient({ initialTargetType, initialTargetId, initialPoliticianSummary, rtiEnabled }: Props) {
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

    if (!rtiText.trim() || !question.trim()) {
      setError("Generate an RTI draft and ensure both question and body are filled.");
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
          setMessage(
            `Payment captured for RTI ${json.data.rti_request_id}. Your RTI will now be processed.`
          );
        } else if (result.status === "dismissed") {
          setMessage(
            "Checkout closed. You can retry payment for this RTI from your history later."
          );
        } else {
          setError("Payment could not be completed. You can retry later from your RTIs.");
        }

        void loadMyRtis();
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
    doc.save("rti-draft-delhi.pdf");
  }

  return (
    <div className="space-y-6 text-left">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-emerald-700">{message}</p>}

      <section className="border rounded-lg p-4 space-y-4">
        <h2 className="font-semibold text-lg">File new RTI</h2>

        <div className="grid gap-4 md:grid-cols-[1fr,2fr]">
          <div className="space-y-3">
            <label className="block text-sm font-medium">
              Target type
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value as TargetType)}
                className="mt-1 w-full border rounded px-3 py-2 text-sm"
              >
                <option value="DEPT">Delhi department (PIO, GNCTD)</option>
                <option value="MLA">MLA (Delhi Assembly)</option>
                <option value="MP">MP (Lok Sabha)</option>
              </select>
            </label>
            {(targetType === "MP" || targetType === "MLA") && (
              <label className="block text-sm font-medium">
                Target politician ID
                <input
                  type="text"
                  value={targetIdInput}
                  onChange={(e) => setTargetIdInput(e.target.value)}
                  className="mt-1 w-full border rounded px-3 py-2 text-sm"
                  placeholder="Internal politician_id (numeric)"
                />
              </label>
            )}
            {initialPoliticianSummary && (
              <div className="border rounded-lg p-3 text-xs bg-slate-50 space-y-1">
                <div className="font-semibold text-slate-800">
                  Target representative
                </div>
                <div className="text-slate-700">
                  {initialPoliticianSummary.name} ·{" "}
                  {initialPoliticianSummary.position}
                  {initialPoliticianSummary.constituencyName
                    ? ` · ${initialPoliticianSummary.constituencyName}`
                    : ""}
                </div>
                <div className="text-[11px]">
                  <a
                    href={`/politician/${initialPoliticianSummary.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    View profile
                  </a>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium">
              RTI question / information sought
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="mt-1 w-full border rounded px-3 py-2 text-sm min-h-[80px]"
                placeholder="Describe clearly what information you want under RTI."
              />
            </label>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleGenerateDraft()}
          className="px-4 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-60"
          disabled={generating}
        >
          {generating ? "Generating draft..." : "Generate Draft"}
        </button>
      </section>

      {draft && (
        <section className="border rounded-lg p-4 space-y-4">
          <h2 className="font-semibold text-lg">Draft RTI</h2>

          <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                RTI body
                <textarea
                  value={rtiText}
                  onChange={(e) => setRtiText(e.target.value)}
                  className="mt-1 w-full border rounded px-3 py-2 text-sm min-h-[200px]"
                />
              </label>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs font-semibold text-slate-500">PIO name</div>
                <div>{draft.pio_name || "Not specified"}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500">PIO address</div>
                <div className="whitespace-pre-line">
                  {draft.pio_address || "Not specified"}
                </div>
              </div>
              {draft.filing_instructions.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-500">
                    Filing instructions (Delhi)
                  </div>
                  <ul className="text-xs text-slate-700 list-disc list-inside space-y-1">
                    {draft.filing_instructions.map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {rtiEnabled !== false && (
              <button
                type="button"
                onClick={() => void handleCreate()}
                className="px-4 py-2 rounded bg-emerald-600 text-white text-sm disabled:opacity-60"
                disabled={creating}
              >
                {creating ? "Saving draft and creating payment..." : "Pay ₹11 & Save"}
              </button>
            )}
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="px-4 py-2 rounded border border-slate-300 text-sm"
            >
              Download RTI PDF
            </button>
          </div>
        </section>
      )}

      <section className="border rounded-lg p-4 space-y-3">
        <h2 className="font-semibold text-lg">My RTIs</h2>
        {myLoading && (
          <p className="text-sm text-slate-600">Loading your RTI history…</p>
        )}
        {!myLoading && myRtis.length === 0 && (
          <p className="text-sm text-slate-600">
            You have not drafted any RTIs yet.
          </p>
        )}
        <div className="space-y-3">
          {myRtis.map((rti) => (
            <article
              key={rti.id}
              className="border rounded p-3 text-sm space-y-1"
            >
              <div className="font-medium line-clamp-2">{rti.question}</div>
              <div className="text-xs text-slate-500">
                {new Date(rti.created_at).toLocaleString()} · Status: {rti.status}
              </div>
              {rti.portal_url && (
                <div className="text-xs text-slate-600">
                  Suggested portal: {rti.portal_url}
                </div>
              )}
              {rti.pio_name && (
                <div className="text-xs text-slate-600">
                  PIO: {rti.pio_name}
                </div>
              )}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedRti(rti)}
                  className="rounded-full border px-3 py-1 text-[11px] font-medium hover:bg-slate-100"
                >
                  View full RTI
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
      {selectedRti && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl bg-white p-4 text-slate-900">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold line-clamp-3">
                  {selectedRti.question}
                </h2>
                <p className="text-xs text-slate-500">
                  {new Date(selectedRti.created_at).toLocaleString()} · Status:{" "}
                  {selectedRti.status}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRti(null)}
                className="ml-2 rounded-full border px-2 py-1 text-xs hover:bg-slate-100"
              >
                Close
              </button>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              {selectedRti.portal_url && (
                <div className="text-xs text-slate-600">
                  Suggested portal: {selectedRti.portal_url}
                </div>
              )}
              {selectedRti.pio_name && (
                <div className="text-xs text-slate-600">
                  PIO: {selectedRti.pio_name}
                </div>
              )}
              {selectedRti.pio_address && (
                <div className="text-xs text-slate-600 whitespace-pre-line">
                  PIO address: {selectedRti.pio_address}
                </div>
              )}
              {selectedRti.rti_text && (
                <div className="mt-2 whitespace-pre-line text-sm text-slate-800">
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
