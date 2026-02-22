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

type TabKey = "file" | "public" | "mine";

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
  const [activeTab, setActiveTab] = useState<TabKey>("file");

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
  }, [setError, setPublicComplaints, setPublicLoading]);

  useEffect(() => {
    if (activeTab === "public" && publicComplaints.length === 0 && !publicLoading) {
      void loadPublicComplaints();
    }
  }, [activeTab, publicComplaints.length, publicLoading, loadPublicComplaints]);

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
    <div className="space-y-6">
      <div className="inline-flex rounded border overflow-hidden text-sm">
        <button
          type="button"
          onClick={() => setActiveTab("file")}
          className={`px-4 py-2 ${
            activeTab === "file" ? "bg-slate-900 text-white" : "bg-white text-slate-800"
          }`}
        >
          File complaint
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("public")}
          className={`px-4 py-2 border-l ${
            activeTab === "public" ? "bg-slate-900 text-white" : "bg-white text-slate-800"
          }`}
        >
          Public complaints
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("mine")}
          className={`px-4 py-2 border-l ${
            activeTab === "mine" ? "bg-slate-900 text-white" : "bg-white text-slate-800"
          }`}
        >
          My complaints
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-green-700">{message}</p>}

      {activeTab === "file" && (
        <div className="space-y-4 text-left">
          {preselectedPoliticianId && props.politicianSummary && (
            <div className="border rounded-lg p-3 text-xs bg-slate-50 space-y-1">
              <div className="font-semibold text-slate-800">
                Target representative
              </div>
              <div className="text-slate-700">
                {props.politicianSummary.name} ·{" "}
                {props.politicianSummary.position}
                {props.politicianSummary.constituencyName
                  ? ` · ${props.politicianSummary.constituencyName}`
                  : ""}
              </div>
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-[1fr,1fr]">
            <div className="space-y-3">
              {user ? (
                <div className="text-xs text-slate-600">
                  Filing as user #{user.id} ({user.state_code})
                </div>
              ) : (
                <p className="text-xs text-red-600">
                  You need to sign in before filing a complaint.
                </p>
              )}
              <label className="block text-sm font-medium">
                Location / area in Delhi
                <input
                  type="text"
                  value={locationText}
                  onChange={(e) => setLocationText(e.target.value)}
                  className="mt-1 w-full border rounded px-3 py-2 text-sm"
                  placeholder="Street, landmark, ward, or locality name"
                />
              </label>
              <label className="block text-sm font-medium">
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
                  className="mt-1 w-full text-sm"
                />
              </label>
              <button
                type="button"
                onClick={() => void handleAnalyze()}
                className="px-4 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-60"
                disabled={analyzing}
              >
                {analyzing ? "Uploading and drafting..." : "Upload and draft complaint"}
              </button>
            </div>

            <div className="space-y-3">
              {photoUrl && (
                <Image
                  src={photoUrl}
                  alt="Complaint photo"
                  width={640}
                  height={360}
                  className="w-full rounded border object-cover max-h-64"
                />
              )}
            </div>
          </div>

          {analysis && (
            <div className="border rounded-lg p-4 space-y-4">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Detected issue
                </div>
                <div className="font-semibold text-sm">{analysis.issue_type}</div>
                <div className="text-xs text-slate-500">
                  Severity: {analysis.severity} | Department: {analysis.department_name}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Complaint title
                  <input
                    type="text"
                    value={analysis.title}
                    onChange={(e) =>
                      setAnalysis({ ...analysis, title: e.target.value })
                    }
                    className="mt-1 w-full border rounded px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm font-medium">
                  Complaint body
                  <textarea
                    value={analysis.description}
                    onChange={(e) =>
                      setAnalysis({ ...analysis, description: e.target.value })
                    }
                    className="mt-1 w-full border rounded px-3 py-2 text-sm min-h-[120px]"
                  />
                </label>
              </div>

              {props.complaintsEnabled !== false && (
                <button
                  type="button"
                  onClick={() => void handleSubmitComplaint()}
                  className="px-4 py-2 rounded bg-emerald-600 text-white text-sm disabled:opacity-60"
                  disabled={submitting}
                >
                  {submitting ? "Submitting complaint..." : "Pay ₹11 & submit complaint"}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "public" && (
        <div className="space-y-4 text-left">
          {publicLoading && <p className="text-sm text-slate-600">Loading complaints…</p>}
          {!publicLoading && publicComplaints.length === 0 && (
            <p className="text-sm text-slate-600">
              No public complaints yet for Delhi.
            </p>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {publicComplaints.map((c) => (
              <div key={c.id} className="border rounded-lg p-3 space-y-2 text-sm">
                <div className="font-semibold">{c.title}</div>
                <div className="text-xs text-slate-500">
                  {new Date(c.created_at).toLocaleString()} · {c.location_text}
                </div>
                {c.photo_url && (
                  <Image
                    src={c.photo_url}
                    alt={c.title}
                    width={640}
                    height={360}
                    className="w-full rounded border object-cover max-h-40"
                  />
                )}
                <div className="text-xs text-slate-600">
                  Status: {c.status} · Severity: {c.severity}
                </div>
                {typeof c.politician_id === "number" && c.politician_id > 0 && (
                  <div className="text-xs">
                    <a
                      href={`/politician/${c.politician_id}`}
                      className="text-blue-600 hover:underline"
                    >
                      View representative
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "mine" && (
        <div className="space-y-4 text-left">
          <button
            type="button"
            onClick={() => void loadMyComplaints()}
            className="px-4 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-60"
            disabled={myLoading}
          >
            {myLoading ? "Loading…" : "Load my complaints"}
          </button>

          {myComplaints.length === 0 && !myLoading && (
            <p className="text-sm text-slate-600">
              No complaints found for this user ID.
            </p>
          )}

          <div className="space-y-3">
            {myComplaints.map((c) => (
              <div key={c.id} className="border rounded-lg p-3 text-sm space-y-1">
                <div className="font-semibold">{c.title}</div>
                <div className="text-xs text-slate-500">
                  {new Date(c.created_at).toLocaleString()} · {c.location_text}
                </div>
                <div className="text-xs text-slate-600">
                  Status: {c.status} · Severity: {c.severity}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedComplaint(c)}
                    className="rounded-full border px-3 py-1 text-[11px] font-medium hover:bg-slate-100"
                  >
                    View full complaint
                  </button>
                  {typeof c.politician_id === "number" && c.politician_id > 0 && (
                    <a
                      href={`/politician/${c.politician_id}`}
                      className="text-blue-600 hover:underline"
                    >
                      View representative
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl bg-white p-4 text-slate-900">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">{selectedComplaint.title}</h2>
                <p className="text-xs text-slate-500">
                  {new Date(selectedComplaint.created_at).toLocaleString()} ·{" "}
                  {selectedComplaint.location_text}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedComplaint(null)}
                className="ml-2 rounded-full border px-2 py-1 text-xs hover:bg-slate-100"
              >
                Close
              </button>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              <div className="text-xs text-slate-600">
                Status: {selectedComplaint.status} · Severity: {selectedComplaint.severity}
              </div>
              {selectedComplaint.department_name && (
                <div className="text-xs text-slate-600">
                  Department: {selectedComplaint.department_name}
                </div>
              )}
              {selectedComplaint.description && (
                <div className="mt-2 whitespace-pre-line text-sm text-slate-800">
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
                    className="w-full rounded border object-cover max-h-64"
                  />
                </div>
              )}
              {typeof selectedComplaint.politician_id === "number" &&
                selectedComplaint.politician_id > 0 && (
                  <div className="mt-3 text-xs">
                    <a
                      href={`/politician/${selectedComplaint.politician_id}`}
                      className="text-blue-600 hover:underline"
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
