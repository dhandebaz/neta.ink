"use client";

import { FormEvent, useMemo, useState } from "react";

type StateSummary = {
  code: string;
  name: string;
  is_enabled: boolean;
  ingestion_status: string;
  primary_city_label: string | null;
};

type IngestionTask = {
  id: number;
  state_code: string;
  task_type: string;
  status: string;
  last_error: string | null;
  updated_at: string | null;
};

type Props = {
  adminUserId: number;
  initialStates: StateSummary[];
};

type LoadTasksState = {
  loading: boolean;
  error: string | null;
};

type RunTaskState = {
  loadingTaskType: string | null;
  error: string | null;
};

type AddStateForm = {
  code: string;
  name: string;
  primaryCityLabel: string;
};

type AddStateState = {
  loading: boolean;
  error: string | null;
  message: string | null;
};

type StateFlags = {
  complaints_enabled: boolean | null;
  rti_enabled: boolean | null;
  ai_complaints_enabled: boolean | null;
  ai_rti_enabled: boolean | null;
};

type FlagsState = {
  loading: boolean;
  error: string | null;
  savingKey: string | null;
};

export function StatesAdminClient({ adminUserId, initialStates }: Props) {
  const [states, setStates] = useState<StateSummary[]>(initialStates);
  const [selectedStateCode, setSelectedStateCode] = useState<string | null>(
    initialStates.length > 0 ? initialStates[0].code : null
  );
  const [tasks, setTasks] = useState<IngestionTask[] | null>(null);
  const [loadTasksState, setLoadTasksState] = useState<LoadTasksState>({
    loading: false,
    error: null
  });
  const [runTaskState, setRunTaskState] = useState<RunTaskState>({
    loadingTaskType: null,
    error: null
  });
  const [addForm, setAddForm] = useState<AddStateForm>({
    code: "",
    name: "",
    primaryCityLabel: ""
  });
  const [addStateState, setAddStateState] = useState<AddStateState>({
    loading: false,
    error: null,
    message: null
  });
  const [flags, setFlags] = useState<StateFlags | null>(null);
  const [flagsState, setFlagsState] = useState<FlagsState>({
    loading: false,
    error: null,
    savingKey: null
  });

  const selectedState = useMemo(
    () => states.find((s) => s.code === selectedStateCode) ?? null,
    [states, selectedStateCode]
  );

  async function refreshTasks(stateCode: string) {
    setLoadTasksState({ loading: true, error: null });

    try {
      const res = await fetch(`/api/admin/ingest/state-task?stateCode=${encodeURIComponent(stateCode)}`, {
        method: "GET",
        headers: {
          "x-admin-user-id": String(adminUserId)
        }
      });

      const json = (await res.json().catch(() => null)) as
        | { success?: boolean; error?: string; tasks?: IngestionTask[] }
        | null;

      if (!res.ok || !json || json.success !== true || !json.tasks) {
        const message =
          json && typeof json.error === "string" && json.error.length > 0
            ? json.error
            : `Failed to load tasks (${res.status})`;
        setLoadTasksState({ loading: false, error: message });
        setTasks(null);
        return;
      }

      setTasks(json.tasks);
      setLoadTasksState({ loading: false, error: null });
    } catch {
      setLoadTasksState({
        loading: false,
        error: "Network error while loading tasks"
      });
      setTasks(null);
    }
  }

  async function refreshFlags(stateCode: string) {
    setFlagsState({ loading: true, error: null, savingKey: null });

    try {
      const res = await fetch(
        `/api/admin/state-flags?stateCode=${encodeURIComponent(stateCode)}`,
        {
          method: "GET",
          headers: {
            "x-admin-user-id": String(adminUserId)
          }
        }
      );

      const json = (await res.json().catch(() => null)) as
        | {
            success?: boolean;
            error?: string;
            flags?: StateFlags;
          }
        | null;

      if (!res.ok || !json || json.success !== true || !json.flags) {
        const message =
          json && typeof json.error === "string" && json.error.length > 0
            ? json.error
            : `Failed to load flags (${res.status})`;
        setFlags(null);
        setFlagsState({ loading: false, error: message, savingKey: null });
        return;
      }

      setFlags(json.flags);
      setFlagsState({ loading: false, error: null, savingKey: null });
    } catch {
      setFlags(null);
      setFlagsState({
        loading: false,
        error: "Network error while loading flags",
        savingKey: null
      });
    }
  }

  type FlagKey = "complaints_enabled" | "rti_enabled" | "ai_complaints_enabled" | "ai_rti_enabled";

  async function toggleFlag(stateCode: string, key: FlagKey) {
    const current = flags?.[key];
    const effective = current === true;
    const nextEnabled = !effective;

    setFlagsState((prev) => ({
      loading: prev.loading,
      error: null,
      savingKey: key
    }));

    setFlags((prev) =>
      prev
        ? {
            ...prev,
            [key]: nextEnabled
          }
        : prev
    );

    try {
      const res = await fetch("/api/admin/state-flags", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-user-id": String(adminUserId)
        },
        body: JSON.stringify({
          stateCode,
          baseKey: key,
          enabled: nextEnabled
        })
      });

      const json = (await res.json().catch(() => null)) as
        | { success?: boolean; error?: string }
        | null;

      if (!res.ok || !json || json.success !== true) {
        const message =
          json && typeof json.error === "string" && json.error.length > 0
            ? json.error
            : `Failed to update flag (${res.status})`;

        setFlagsState({
          loading: false,
          error: message,
          savingKey: null
        });

        setFlags((prev) =>
          prev
            ? {
                ...prev,
                [key]: current ?? null
              }
            : prev
        );
        return;
      }

      setFlagsState({
        loading: false,
        error: null,
        savingKey: null
      });
    } catch {
      setFlagsState({
        loading: false,
        error: "Network error while updating flag",
        savingKey: null
      });
      setFlags((prev) =>
        prev
          ? {
              ...prev,
              [key]: current ?? null
            }
          : prev
      );
    }
  }

  async function toggleState(code: string, nextEnabled: boolean) {
    setStates((prev) =>
      prev.map((s) => (s.code === code ? { ...s, is_enabled: nextEnabled } : s))
    );

    try {
      const res = await fetch("/api/admin/states", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-user-id": String(adminUserId)
        },
        body: JSON.stringify({
          action: "toggle",
          stateCode: code,
          isEnabled: nextEnabled
        })
      });

      const json = (await res.json().catch(() => null)) as
        | { success?: boolean; error?: string; state?: StateSummary }
        | null;

      if (!res.ok || !json || json.success !== true || !json.state) {
        const message =
          json && typeof json.error === "string" && json.error.length > 0
            ? json.error
            : `Failed to update state (${res.status})`;

        setStates((prev) =>
          prev.map((s) =>
            s.code === code ? { ...s, is_enabled: !nextEnabled } : s
          )
        );

        alert(message);
        return;
      }

      setStates((prev) =>
        prev.map((s) => (s.code === code ? json.state! : s))
      );
    } catch {
      setStates((prev) =>
        prev.map((s) =>
          s.code === code ? { ...s, is_enabled: !nextEnabled } : s
        )
      );
      alert("Network error while toggling state");
    }
  }

  async function runTask(stateCode: string, taskType: string) {
    setRunTaskState({ loadingTaskType: taskType, error: null });

    try {
      const res = await fetch("/api/admin/ingest/state-task", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-user-id": String(adminUserId)
        },
        body: JSON.stringify({
          stateCode,
          taskType
        })
      });

      const json = (await res.json().catch(() => null)) as
        | { success?: boolean; error?: string }
        | null;

      if (!res.ok || !json || json.success !== true) {
        const message =
          json && typeof json.error === "string" && json.error.length > 0
            ? json.error
            : `Failed to run task (${res.status})`;
        setRunTaskState({ loadingTaskType: null, error: message });
        return;
      }

      await refreshTasks(stateCode);
      setRunTaskState({ loadingTaskType: null, error: null });
    } catch {
      setRunTaskState({
        loadingTaskType: null,
        error: "Network error while running task"
      });
    }
  }

  async function handleAddState(e: FormEvent) {
    e.preventDefault();

    setAddStateState({
      loading: true,
      error: null,
      message: null
    });

    const code = addForm.code.trim().toUpperCase();
    const name = addForm.name.trim();
    const primaryCityLabel = addForm.primaryCityLabel.trim();

    if (!code || code.length !== 2 || !name) {
      setAddStateState({
        loading: false,
        error: "Enter a 2-letter code and a state name.",
        message: null
      });
      return;
    }

    try {
      const res = await fetch("/api/admin/states", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-user-id": String(adminUserId)
        },
        body: JSON.stringify({
          action: "add",
          stateCode: code,
          stateName: name,
          primaryCityLabel: primaryCityLabel || null
        })
      });

      const json = (await res.json().catch(() => null)) as
        | { success?: boolean; error?: string; state?: StateSummary }
        | null;

      if (!res.ok || !json || json.success !== true || !json.state) {
        const message =
          json && typeof json.error === "string" && json.error.length > 0
            ? json.error
            : `Failed to add state (${res.status})`;
        setAddStateState({
          loading: false,
          error: message,
          message: null
        });
        return;
      }

      setStates((prev) => {
        const existingIndex = prev.findIndex((s) => s.code === json.state!.code);

        if (existingIndex === -1) {
          return [...prev, json.state!].sort((a, b) =>
            a.name.localeCompare(b.name)
          );
        }

        const next = [...prev];
        next[existingIndex] = json.state!;
        return next;
      });

      setSelectedStateCode(json.state.code);
      setAddForm({
        code: "",
        name: "",
        primaryCityLabel: ""
      });
      setAddStateState({
        loading: false,
        error: null,
        message: "State saved."
      });
    } catch {
      setAddStateState({
        loading: false,
        error: "Network error while saving state",
        message: null
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">States</h3>
          <span className="text-[11px] text-slate-500">
            {states.length} configured
          </span>
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  Code
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  Name
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  Enabled
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  Ingestion
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {states.map((state) => (
                <tr key={state.code} className="border-t">
                  <td className="px-3 py-2 align-top text-slate-800">
                    {state.code}
                  </td>
                  <td className="px-3 py-2 align-top text-slate-800">
                    {state.name}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <button
                      type="button"
                      onClick={() =>
                        void toggleState(state.code, !state.is_enabled)
                      }
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                        state.is_enabled
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : "border-slate-400 bg-slate-100 text-slate-700"
                      }`}
                    >
                      {state.is_enabled ? "Enabled" : "Disabled"}
                    </button>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        state.ingestion_status === "ready"
                          ? "bg-emerald-50 text-emerald-700"
                          : state.ingestion_status === "error"
                          ? "bg-red-50 text-red-700"
                          : state.ingestion_status === "ingesting"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {state.ingestion_status}
                    </span>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStateCode(state.code);
                        void refreshTasks(state.code);
                        void refreshFlags(state.code);
                      }}
                      className="inline-flex items-center rounded-full border border-slate-400 px-2 py-0.5 text-[11px] font-medium text-slate-800 hover:bg-slate-50"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
              {states.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-3 text-center text-xs text-slate-500"
                  >
                    No states configured yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Add or edit state</h3>
          <p className="text-xs text-slate-600">
            Create a state row. New states start disabled with ingestion set to idle.
          </p>
          <form className="space-y-2" onSubmit={handleAddState}>
            <div className="grid grid-cols-[80px_minmax(0,1fr)] gap-2">
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-700">
                  Code
                </label>
                <input
                  type="text"
                  value={addForm.code}
                  onChange={(e) =>
                    setAddForm((prev) => ({
                      ...prev,
                      code: e.target.value.toUpperCase()
                    }))
                  }
                  className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                  maxLength={2}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-700">
                  Name
                </label>
                <input
                  type="text"
                  value={addForm.name}
                  onChange={(e) =>
                    setAddForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                  placeholder="Maharashtra"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-slate-700">
                Primary city label (optional)
              </label>
              <input
                type="text"
                value={addForm.primaryCityLabel}
                onChange={(e) =>
                  setAddForm((prev) => ({
                    ...prev,
                    primaryCityLabel: e.target.value
                  }))
                }
                className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                placeholder="Mumbai"
              />
            </div>
            {addStateState.error && (
              <p className="text-[11px] text-red-600">{addStateState.error}</p>
            )}
            {addStateState.message && (
              <p className="text-[11px] text-emerald-700">
                {addStateState.message}
              </p>
            )}
            <button
              type="submit"
              className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-[11px] font-medium text-slate-50 disabled:opacity-60"
              disabled={addStateState.loading}
            >
              {addStateState.loading ? "Saving..." : "Save state"}
            </button>
          </form>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">
              State detail{" "}
              {selectedState ? `for ${selectedState.name} (${selectedState.code})` : ""}
            </h3>
          </div>
          {!selectedState && (
            <p className="text-xs text-slate-600">
              Select a state above to view ingestion tasks and feature flags.
            </p>
          )}
          {selectedState && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-800">
                  Per-state feature flags
                </h4>
                {flagsState.error && (
                  <p className="text-[11px] text-red-600">
                    {flagsState.error}
                  </p>
                )}
                {flagsState.loading && (
                  <p className="text-[11px] text-slate-600">
                    Loading flags...
                  </p>
                )}
                {!flagsState.loading && (
                  <div className="space-y-2">
                    {[
                      {
                        key: "complaints_enabled" as FlagKey,
                        label: "Complaints enabled for this state",
                        helper:
                          "Controls whether citizens can file complaints for this state."
                      },
                      {
                        key: "rti_enabled" as FlagKey,
                        label: "RTI enabled for this state",
                        helper:
                          "Controls whether RTI drafting is available for this state."
                      },
                      {
                        key: "ai_complaints_enabled" as FlagKey,
                        label: "AI helper for complaints enabled",
                        helper:
                          "Controls whether AI powers complaint analysis and drafting."
                      },
                      {
                        key: "ai_rti_enabled" as FlagKey,
                        label: "AI helper for RTI enabled",
                        helper:
                          "Controls whether AI powers RTI drafting for this state."
                      }
                    ].map((flagDef) => {
                      const current =
                        flags && flagDef.key in flags
                          ? (flags as any)[flagDef.key]
                          : null;
                      const isOn = current === true;

                      return (
                        <div
                          key={flagDef.key}
                          className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2"
                        >
                          <div className="space-y-1">
                            <div className="text-[11px] font-semibold text-slate-800">
                              {flagDef.label}
                            </div>
                            <p className="text-[11px] text-slate-500">
                              {flagDef.helper}
                              {current === null && (
                                <> Currently using the global default.</>
                              )}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              void toggleFlag(selectedState.code, flagDef.key)
                            }
                            disabled={
                              flagsState.savingKey === flagDef.key ||
                              flagsState.loading
                            }
                            className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-medium ${
                              isOn
                                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                : "border-slate-400 bg-slate-100 text-slate-700"
                            } ${
                              flagsState.savingKey === flagDef.key
                                ? "opacity-60"
                                : ""
                            }`}
                          >
                            {flagsState.savingKey === flagDef.key
                              ? "Saving..."
                              : isOn
                              ? "On"
                              : "Off"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold text-slate-800">
                    Ingestion tasks
                  </h4>
                  {loadTasksState.error && (
                    <span className="text-[11px] text-red-600">
                      {loadTasksState.error}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {["politicians", "constituencies", "civic_contacts", "rti_portal"].map(
                    (taskType) => (
                      <button
                        key={taskType}
                        type="button"
                        onClick={() =>
                          void runTask(selectedState.code, taskType)
                        }
                        className="inline-flex items-center rounded-full bg-blue-600 px-3 py-1 text-[11px] font-medium text-white disabled:opacity-60"
                        disabled={
                          runTaskState.loadingTaskType === taskType ||
                          loadTasksState.loading
                        }
                      >
                        {runTaskState.loadingTaskType === taskType
                          ? `Running ${taskType}...`
                          : `Run ${taskType} ingestion`}
                      </button>
                    )
                  )}
                </div>
                {runTaskState.error && (
                  <p className="text-[11px] text-red-600">
                    {runTaskState.error}
                  </p>
                )}
                <div className="overflow-x-auto rounded-lg border">
                  <table className="min-w-full text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700">
                          Task
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700">
                          Status
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700">
                          Updated
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700">
                          Last error
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadTasksState.loading && (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-3 py-3 text-center text-xs text-slate-500"
                          >
                            Loading tasks...
                          </td>
                        </tr>
                      )}
                      {!loadTasksState.loading &&
                        tasks &&
                        tasks.map((task) => (
                          <tr key={task.id} className="border-t">
                            <td className="px-3 py-2 align-top text-slate-800">
                              {task.task_type}
                            </td>
                            <td className="px-3 py-2 align-top">
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                  task.status === "success"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : task.status === "error"
                                    ? "bg-red-50 text-red-700"
                                    : task.status === "running"
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {task.status}
                              </span>
                            </td>
                            <td className="px-3 py-2 align-top text-slate-800">
                              {task.updated_at ?? ""}
                            </td>
                            <td className="px-3 py-2 align-top text-slate-800">
                              {task.last_error ?? ""}
                            </td>
                          </tr>
                        ))}
                      {!loadTasksState.loading &&
                        tasks &&
                        tasks.length === 0 && (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-3 py-3 text-center text-xs text-slate-500"
                            >
                              No tasks recorded yet.
                            </td>
                          </tr>
                        )}
                      {!loadTasksState.loading && !tasks && (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-3 py-3 text-center text-xs text-slate-500"
                          >
                            Tasks will appear here after loading.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
