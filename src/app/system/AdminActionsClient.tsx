"use client";

import { useState } from "react";

type Props = {
  adminUserId: number;
};

type ActionState = {
  loading: boolean;
  message: string | null;
  error: string | null;
};

import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function AdminActionsClient({ adminUserId }: Props) {
  const router = useRouter();
  const [ingestState, setIngestState] = useState<ActionState>({
    loading: false,
    message: null,
    error: null
  });

  const [aiIngestState, setAiIngestState] = useState<ActionState>({
    loading: false,
    message: null,
    error: null,
  });

  const [aiStateCode, setAiStateCode] = useState("");

  async function callEndpoint(
    url: string,
    setState: (s: ActionState) => void,
    body?: any
  ) {
    setState({ loading: true, message: null, error: null });

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "x-admin-user-id": String(adminUserId),
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const text = await res.text();

      if (!res.ok) {
        setState({
          loading: false,
          message: null,
          error: `Request failed (${res.status})`,
        });
        return;
      }

      setState({
        loading: false,
        message: "Request succeeded.",
        error: null,
      });
    } catch (error) {
      setState({
        loading: false,
        message: null,
        error: "Network error while calling admin endpoint",
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 border-b pb-4">
        <h3 className="font-semibold text-sm text-slate-700">Core Seeds</h3>
        <div className="flex gap-4 flex-wrap">
          <div className="space-y-1">
            <button
              type="button"
              onClick={() =>
                void callEndpoint("/api/admin/ingest/delhi", setIngestState)
              }
              className="px-4 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-60 flex items-center gap-2"
              disabled={ingestState.loading}
            >
              {ingestState.loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Running...</span>
                </>
              ) : (
                "Run Delhi Ingestion"
              )}
            </button>
            {ingestState.message && (
              <p className="text-xs text-emerald-700">{ingestState.message}</p>
            )}
            {ingestState.error && (
              <p className="text-xs text-red-600">{ingestState.error}</p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold text-sm text-slate-700">
          Auto-Ingest via AI Brain
        </h3>
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">
              State Code (e.g. UP, KA)
            </label>
            <input
              type="text"
              value={aiStateCode}
              onChange={(e) => setAiStateCode(e.target.value.toUpperCase())}
              className="block w-24 px-2 py-2 text-sm border rounded bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
              placeholder="XX"
              maxLength={2}
            />
          </div>
          <button
            type="button"
            onClick={() =>
              void callEndpoint(
                "/api/admin/ingest/agent",
                setAiIngestState,
                { stateCode: aiStateCode, taskType: "politicians" }
              )
            }
            className="px-4 py-2 rounded bg-purple-600 text-white text-sm disabled:opacity-60 flex items-center gap-2"
            disabled={aiIngestState.loading || !aiStateCode}
          >
            {aiIngestState.loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Waking up Brain...</span>
              </>
            ) : (
              "Start Auto-Ingest"
            )}
          </button>
        </div>
        {aiIngestState.message && (
          <p className="text-xs text-emerald-700">{aiIngestState.message}</p>
        )}
        {aiIngestState.error && (
          <p className="text-xs text-red-600">{aiIngestState.error}</p>
        )}
      </div>
    </div>
  );
}
