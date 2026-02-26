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
    error: null,
  });

  const [maharashtraSeedState, setMaharashtraSeedState] = useState<ActionState>({
    loading: false,
    message: null,
    error: null,
  });

  const [panIndiaSeedState, setPanIndiaSeedState] = useState<ActionState>({
    loading: false,
    message: null,
    error: null,
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

  async function populateAllStates() {
    setPanIndiaSeedState({ loading: true, message: null, error: null });
    try {
      const res = await fetch("/api/admin/states/seed-all", {
        method: "POST",
        headers: {
          "x-admin-user-id": String(adminUserId),
        },
      });

      if (!res.ok) {
        setPanIndiaSeedState({
          loading: false,
          message: null,
          error: `Request failed (${res.status})`,
        });
        return;
      }

      window.location.reload();
    } catch (error) {
      setPanIndiaSeedState({
        loading: false,
        message: null,
        error: "Network error",
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
              className="px-4 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-60"
              disabled={ingestState.loading}
            >
              {ingestState.loading
                ? "Running Delhi ingestion..."
                : "Run Delhi Ingestion"}
            </button>
            {ingestState.message && (
              <p className="text-xs text-emerald-700">{ingestState.message}</p>
            )}
            {ingestState.error && (
              <p className="text-xs text-red-600">{ingestState.error}</p>
            )}
          </div>

          <div className="space-y-1">
            <button
              type="button"
              onClick={() =>
                void callEndpoint("/api/admin/seed/delhi-core", setSeedState)
              }
              className="px-4 py-2 rounded bg-emerald-600 text-white text-sm disabled:opacity-60"
              disabled={seedState.loading}
            >
              {seedState.loading
                ? "Running Delhi core seed..."
                : "Run Delhi Core Seed"}
            </button>
            {seedState.message && (
              <p className="text-xs text-emerald-700">{seedState.message}</p>
            )}
            {seedState.error && (
              <p className="text-xs text-red-600">{seedState.error}</p>
            )}
          </div>

          <div className="space-y-1">
            <button
              type="button"
              onClick={() =>
                void callEndpoint(
                  "/api/admin/seed/maharashtra-core",
                  setMaharashtraSeedState
                )
              }
              className="px-4 py-2 rounded bg-orange-600 text-white text-sm disabled:opacity-60"
              disabled={maharashtraSeedState.loading}
            >
              {maharashtraSeedState.loading
                ? "Running MH core seed..."
                : "Run Maharashtra Core Seed"}
            </button>
            {maharashtraSeedState.message && (
              <p className="text-xs text-emerald-700">
                {maharashtraSeedState.message}
              </p>
            )}
            {maharashtraSeedState.error && (
              <p className="text-xs text-red-600">
                {maharashtraSeedState.error}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <button
              type="button"
              onClick={() => void populateAllStates()}
              className="px-4 py-2 rounded bg-indigo-600 text-white text-sm disabled:opacity-60"
              disabled={panIndiaSeedState.loading}
            >
              {panIndiaSeedState.loading
                ? "Populating..."
                : "Populate All Indian States"}
            </button>
            {panIndiaSeedState.error && (
              <p className="text-xs text-red-600">{panIndiaSeedState.error}</p>
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
            className="px-4 py-2 rounded bg-purple-600 text-white text-sm disabled:opacity-60"
            disabled={aiIngestState.loading || !aiStateCode}
          >
            {aiIngestState.loading ? "Waking up Brain..." : "Start Auto-Ingest"}
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
