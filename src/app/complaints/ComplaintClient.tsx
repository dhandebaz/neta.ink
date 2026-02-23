"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { openRazorpayCheckout } from "@/lib/payments/razorpayClient";

type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; data?: any };

type ComplaintSummary = {
  id: number;
  title: string;
  photo_url: string;
  location_text: string;
  status: string;
  severity: string;
  created_at: string;
  politician_id?: number | null;
  description?: string | null;
  department_name?: string | null;
};

type AnalysisData = {
  photoUrl: string;
  locationText: string;
  issue_type: string;
  severity: string;
  department_name: string;
  title: string;
  description: string;
  needs_additional_info: boolean;
  additional_fields: string[];
};

type TargetPoliticianSummary = {
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
  politicianId?: number;
  politicianSummary?: TargetPoliticianSummary;
  complaintsEnabled?: boolean;
};

export function ComplaintClient(props: Props) {
  const [user, setUser] = useState<CurrentUserSummary | null>(null);
  const [locationText, setLocationText] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [publicComplaints, setPublicComplaints] = useState<ComplaintSummary[]>([]);
  const [publicLoading, setPublicLoading] = useState(false);

  const [myComplaints, setMyComplaints] = useState<ComplaintSummary[]>([]);
  const [myLoading, setMyLoading] = useState(false);

  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintSummary | null>(null);
  const [fileOpen, setFileOpen] = useState(true);

  const preselectedPoliticianId =
    typeof props.politicianId === "number" && Number.isFinite(props.politicianId)
      ? props.politicianId
      : undefined;

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
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
    }
    void loadUser();
  }, []);

  const loadPublicComplaints = useCallback(async () => {
    setPublicLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/complaints/public");
      const json = (await res.json()) as ApiResponse<ComplaintSummary[]>;

      if (!res.ok || !json.success) {
        const message =
          "error" in json && typeof json.error === "string"
            ? json.error
            : "Failed to load complaints";
        setError(message);
      } else {
        setPublicComplaints(json.data);
      }
    } catch {
      setError("Network error while loading public complaints");
    } finally {
      setPublicLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPublicComplaints();
  }, [loadPublicComplaints]);

  async function loadMyComplaints() {
    setMyLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/complaints/mine");
      const json = (await res.json()) as ApiResponse<ComplaintSummary[]>;

      if (!res.ok || !json.success) {
        const message =
          "error" in json && typeof json.error === "string"
            ? json.error
            : "Failed to load your complaints";
        setError(message);
      } else {
        setMyComplaints(json.data);
      }
    } catch {
      setError("Network error while loading your complaints");
    } finally {
      setMyLoading(false);
    }
  }

  async function handleAnalyze() {
    setError(null);
    setMessage(null);
    setAnalysis(null);

    if (!photoFile) {
      setError("Please select a photo of the civic issue.");
      return;
    }

    const loc = locationText.trim();

    if (!loc) {
      setError("Please enter a location or area in Delhi.");
      return;
    }

    setAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append("file", photoFile);

      const uploadRes = await fetch("/api/complaints/upload-photo", {
        method: "POST",
        body: formData
      });

      const uploadJson = (await uploadRes.json()) as ApiResponse<{ url: string }>;

      if (!uploadRes.ok || !uploadJson.success) {
        const message =
          "error" in uploadJson && typeof uploadJson.error === "string"
            ? uploadJson.error
            : "Photo upload failed";
        setError(message);
        return;
      }

      const url = (uploadJson as any).url ?? (uploadJson as any).data?.url;

      if (typeof url !== "string") {
        setError("Photo upload response was invalid");
        return;
      }

      setPhotoUrl(url);

      const analyzeRes = await fetch("/api/complaints/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoUrl: url,
          locationText: loc
        })
      });

      const analyzeJson = (await analyzeRes.json()) as ApiResponse<AnalysisData>;

      if (!analyzeRes.ok || !analyzeJson.success) {
        const message =
          "error" in analyzeJson && typeof analyzeJson.error === "string"
            ? analyzeJson.error
            : "AI analysis failed";
        setError(message);
      } else {
        setAnalysis(analyzeJson.data);
        setMessage("Draft generated. Review and submit your complaint.");
      }
    } catch {
      setError("Network error during upload or analysis.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSubmitComplaint() {
    setError(null);
    setMessage(null);

    if (!user) {
      setError("Sign in before filing a complaint.");
      return;
    }

    if (!photoUrl || !analysis) {
      setError("Upload and analyze a photo before submitting.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/complaints/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
          photoUrl,
          locationText: analysis.locationText,
          title: analysis.title,
          description: analysis.description,
          departmentName: analysis.department_name,
          severity: analysis.severity,
          politicianId: preselectedPoliticianId
        })
      });

      const json = (await res.json()) as ApiResponse<{
        complaint_id: number;
        payment_id: number;
        razorpay_order: { id: string; amount: number; currency: string };
      }>;

      if (!res.ok || !json.success) {
        const message =
          "error" in json && typeof json.error === "string"
            ? json.error
            : "Failed to create complaint";
        setError(message);
      } else {
        const order = json.data.razorpay_order;

        const result = await openRazorpayCheckout({
          order,
          notes: {
            task_type: "complaint_drafting",
            complaint_id: String(json.data.complaint_id)
          }
        });

        if (result.status === "success") {
          setMessage(
            `Payment captured for complaint ${json.data.complaint_id}. Your complaint will now be processed.`
          );
        } else if (result.status === "dismissed") {
          setMessage(
            "Checkout closed. You can retry payment for this complaint from your history later."
          );
        } else {
          setError("Payment could not be completed. You can retry later from your complaints.");
        }
      }
    } catch {
      setError("Network error while creating complaint.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
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

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/80">
        <div className="flex w-full items-center justify-between px-4 py-3 text-left sm:px-5">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-300">
              File a civic complaint
            </div>
            <p className="mt-1 text-xs text-slate-300">
              Upload a photo, let AI draft the complaint, then pay ₹11 to submit.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFileOpen((open) => !open)}
            className="ml-3 flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-xs text-slate-300 hover:border-amber-400 hover:text-amber-200"
          >
            {fileOpen ? "−" : "+"}
          </button>
        </div>

        {fileOpen && (
          <div className="border-t border-slate-800/80 px-4 py-4 text-left sm:px-5 sm:py-5">
            <div className="space-y-4">
              {preselectedPoliticianId && props.politicianSummary && (
                <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-3 text-xs space-y-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">
                    Target representative
                  </div>
                  <div className="text-xs text-slate-200">
                    {props.politicianSummary.name} · {props.politicianSummary.position}
                    {props.politicianSummary.constituencyName
                      ? ` · ${props.politicianSummary.constituencyName}`
                      : ""}
                  </div>
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-[1.1fr,0.9fr]">
                <div className="space-y-3">
                  {user ? (
                    <div className="text-[11px] text-slate-400">
                      Filing as user #{user.id} ({user.state_code})
                    </div>
                  ) : (
                    <p className="text-[11px] text-red-300">
                      You need to sign in before filing a complaint.
                    </p>
                  )}
                  <label className="block text-xs font-medium text-slate-200">
                    Location / area in Delhi
                    <input
                      type="text"
                      value={locationText}
                      onChange={(e) => setLocationText(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-amber-400"
                      placeholder="Street, landmark, ward, or locality name"
                    />
                  </label>
                  <label className="block text-xs font-medium text-slate-200">
                    Issue photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        setPhotoFile(file);
                        setPhotoUrl(null);
                        setAnalysis(null);
                      }}
                      className="mt-1 w-full text-xs text-slate-200 file:mr-3 file:rounded-full file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-100 hover:file:bg-slate-700"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void handleAnalyze()}
                    className="inline-flex items-center justify-center rounded-full bg-amber-400 px-4 py-2 text-sm font-medium text-slate-950 shadow-sm hover:bg-amber-300 disabled:opacity-60"
                    disabled={analyzing}
                  >
                    {analyzing ? "Uploading and drafting..." : "Upload photo and draft complaint"}
                  </button>
                </div>

                <div className="space-y-3">
                  {photoUrl && (
                    <Image
                      src={photoUrl}
                      alt="Complaint photo"
                      width={640}
                      height={360}
                      className="w-full max-h-64 rounded-xl border border-slate-700 object-cover"
                    />
                  )}
                </div>
              </div>

              {analysis && (
                <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4 space-y-4">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Detected issue
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-50">
                      {analysis.issue_type}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400">
                      Severity: {analysis.severity} · Department: {analysis.department_name}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-xs font-medium text-slate-200">
                      Complaint title
                      <input
                        type="text"
                        value={analysis.title}
                        onChange={(e) =>
                          setAnalysis({ ...analysis, title: e.target.value })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-amber-400"
                      />
                    </label>
                    <label className="block text-xs font-medium text-slate-200">
                      Complaint body
                      <textarea
                        value={analysis.description}
                        onChange={(e) =>
                          setAnalysis({ ...analysis, description: e.target.value })
                        }
                        className="mt-1 w-full min-h-[120px] rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-amber-400"
                      />
                    </label>
                  </div>

                  {props.complaintsEnabled !== false && (
                    <button
                      type="button"
                      onClick={() => void handleSubmitComplaint()}
                      className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 shadow-sm hover:bg-emerald-400 disabled:opacity-60"
                      disabled={submitting}
                    >
                      {submitting ? "Submitting complaint..." : "Pay ₹11 & submit complaint"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3 text-left">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Public complaints
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Recent civic issues filed through neta. Personal details are kept private.
            </p>
          </div>
          {publicComplaints.length > 0 && (
            <div className="text-[11px] text-slate-500">
              {publicComplaints.length} posted
            </div>
          )}
        </div>

        {publicLoading && (
          <p className="text-xs text-slate-400">Loading complaints…</p>
        )}
        {!publicLoading && publicComplaints.length === 0 && (
          <p className="text-xs text-slate-500">
            No public complaints yet for Delhi.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {publicComplaints.map((c) => (
            <div
              key={c.id}
              className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-xs text-slate-200"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-slate-50">
                      {c.title}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400">
                      {new Date(c.created_at).toLocaleString()} · {c.location_text}
                    </div>
                  </div>
                  <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-200">
                    {c.status}
                  </span>
                </div>

                {c.photo_url && (
                  <div className="mt-1">
                    <Image
                      src={c.photo_url}
                      alt={c.title}
                      width={640}
                      height={360}
                      className="w-full max-h-40 rounded-lg border border-slate-800 object-cover"
                    />
                  </div>
                )}

                <div className="text-[11px] text-slate-400">
                  Severity: {c.severity}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                {typeof c.politician_id === "number" && c.politician_id > 0 ? (
                  <a
                    href={`/politician/${c.politician_id}`}
                    className="inline-flex items-center rounded-full border border-slate-700 px-3 py-1 font-medium text-slate-200 hover:border-amber-400 hover:text-amber-200"
                  >
                    View representative
                  </a>
                ) : (
                  <span className="text-slate-500">Representative auto-routed</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 text-left">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              My complaints
            </div>
            <p className="mt-1 text-xs text-slate-400">
              View the complaints you have filed and track their status.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadMyComplaints()}
            className="inline-flex items-center justify-center rounded-full bg-slate-800 px-3 py-1.5 text-[11px] font-medium text-slate-100 hover:bg-slate-700 disabled:opacity-60"
            disabled={myLoading}
          >
            {myLoading ? "Loading…" : "Load my complaints"}
          </button>
        </div>

        {myComplaints.length === 0 && !myLoading && (
          <p className="text-xs text-slate-500">
            No complaints found for this user ID.
          </p>
        )}

        <div className="space-y-3">
          {myComplaints.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-xs text-slate-200"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-slate-50">
                    {c.title}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    {new Date(c.created_at).toLocaleString()} · {c.location_text}
                  </div>
                </div>
                <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-200">
                  {c.status}
                </span>
              </div>
              <div className="mt-2 text-[11px] text-slate-400">
                Severity: {c.severity}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px]">
                <button
                  type="button"
                  onClick={() => setSelectedComplaint(c)}
                  className="inline-flex items-center rounded-full border border-slate-700 px-3 py-1 font-medium text-slate-100 hover:border-amber-400 hover:text-amber-200"
                >
                  View full complaint
                </button>
                {typeof c.politician_id === "number" && c.politician_id > 0 && (
                  <a
                    href={`/politician/${c.politician_id}`}
                    className="text-amber-300 hover:text-amber-200"
                  >
                    View representative
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 p-4 text-slate-50">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">{selectedComplaint.title}</h2>
                <p className="text-[11px] text-slate-400">
                  {new Date(selectedComplaint.created_at).toLocaleString()} ·{" "}
                  {selectedComplaint.location_text}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedComplaint(null)}
                className="ml-2 inline-flex items-center justify-center rounded-full border border-slate-600 px-2 py-1 text-[11px] hover:border-amber-400 hover:text-amber-200"
              >
                Close
              </button>
            </div>
            <div className="mt-3 space-y-3 text-sm">
              <div className="text-[11px] text-slate-400">
                Status: {selectedComplaint.status} · Severity: {selectedComplaint.severity}
              </div>
              {selectedComplaint.department_name && (
                <div className="text-[11px] text-slate-400">
                  Department: {selectedComplaint.department_name}
                </div>
              )}
              {selectedComplaint.description && (
                <div className="mt-2 whitespace-pre-line text-sm text-slate-100">
                  {selectedComplaint.description}
                </div>
              )}
              {selectedComplaint.photo_url && (
                <div className="mt-3">
                  <Image
                    src={selectedComplaint.photo_url}
                    alt={selectedComplaint.title}
                    width={640}
                    height={360}
                    className="w-full max-h-64 rounded-lg border border-slate-700 object-cover"
                  />
                </div>
              )}
              {typeof selectedComplaint.politician_id === "number" &&
                selectedComplaint.politician_id > 0 && (
                  <div className="mt-3 text-[11px]">
                    <a
                      href={`/politician/${selectedComplaint.politician_id}`}
                      className="text-amber-300 hover:text-amber-200"
                    >
                      View representative profile
                    </a>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
