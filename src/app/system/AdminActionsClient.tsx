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

export function AdminActionsClient({ adminUserId }: Props) {
  const [ingestState, setIngestState] = useState<ActionState>({
    loading: false,
    message: null,
    error: null
  });

  const [seedState, setSeedState] = useState<ActionState>({
    loading: false,
    message: null,
    error: null
  });

  async function callEndpoint(
    url: string,
    setState: (s: ActionState) => void
  ) {
    setState({ loading: true, message: null, error: null });

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "x-admin-user-id": String(adminUserId)
        }
      });

      const text = await res.text();

      if (!res.ok) {
        setState({
          loading: false,
          message: null,
          error: `Request failed (${res.status})`
        });
        return;
      }

      setState({
        loading: false,
        message: "Request succeeded.",
        error: null
      });
    } catch (error) {
      setState({
        loading: false,
        message: null,
        error: "Network error while calling admin endpoint"
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <button
          type="button"
          onClick={() =>
            void callEndpoint("/api/admin/ingest/delhi", setIngestState)
          }
          className="px-4 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-60"
          disabled={ingestState.loading}
        >
          {ingestState.loading ? "Running Delhi ingestion..." : "Run Delhi Ingestion"}
        </button>
        {ingestState.message && (
          <p className="text-xs text-emerald-700">{ingestState.message}</p>
        )}
        {ingestState.error && (
          <p className="text-xs text-red-600">{ingestState.error}</p>
        )}
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={() =>
            void callEndpoint("/api/admin/seed/delhi-core", setSeedState)
          }
          className="px-4 py-2 rounded bg-emerald-600 text-white text-sm disabled:opacity-60"
          disabled={seedState.loading}
        >
          {seedState.loading ? "Running Delhi core seed..." : "Run Delhi Core Seed"}
        </button>
        {seedState.message && (
          <p className="text-xs text-emerald-700">{seedState.message}</p>
        )}
        {seedState.error && (
          <p className="text-xs text-red-600">{seedState.error}</p>
        )}
      </div>
    </div>
  );
}

