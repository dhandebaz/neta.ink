"use client";

import { FormEvent, useMemo, useState } from "react";

import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

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

type AgentTaskState = {
  loading: boolean;
  error: string | null;
  message: string | null;
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
  const router = useRouter();
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
  const [agentTaskState, setAgentTaskState] = useState<AgentTaskState>({
    loading: false,
    error: null,
    message: null
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
      router.refresh();
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
      router.refresh();
    } catch {
      setRunTaskState({
        loadingTaskType: null,
        error: "Network error while running task"
      });
    }
  }

  async function runAgentTask(stateCode: string) {
    setAgentTaskState({
      loading: true,
      error: null,
      message: null
    });

    try {
      const res = await fetch("/api/admin/ingest/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-user-id": String(adminUserId)
        },
        body: JSON.stringify({
          stateCode,
          taskType: "politicians"
        })
      });

      const json = (await res.json().catch(() => null)) as
        | { success?: boolean; error?: string; count?: number }
        | null;

      if (!res.ok || !json || json.success !== true) {
        const message =
          json && typeof json.error === "string" && json.error.length > 0
            ? json.error
            : `Failed to run agent ingestion (${res.status})`;
        setAgentTaskState({
          loading: false,
          error: message,
          message: null
        });
        return;
      }

      const countLabel =
        typeof json.count === "number" && json.count > 0
          ? `Successfully extracted and saved ${json.count} politicians.`
          : "Successfully extracted and saved politicians.";

      await refreshTasks(stateCode);
      setAgentTaskState({
        loading: false,
        error: null,
        message: countLabel
      });
      router.refresh();
    } catch {
      setAgentTaskState({
        loading: false,
        error: "Network error while running agent ingestion",
        message: null
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
      router.refresh();
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

        <div className="space-y-3">
          {states.map((state) => {
            const isExpanded = selectedStateCode === state.code;

            return (
              <div
                key={state.code}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden"
              >
                {/* Card Header */}
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300">
                      {state.code}
                    </span>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                        {state.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                            state.is_enabled
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400"
                          }`}
                        >
                          {state.is_enabled ? "Live" : "Disabled"}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                            state.ingestion_status === "completed"
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                              : state.ingestion_status === "running"
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                              : state.ingestion_status === "failed"
                              ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                              : "bg-slate-50 text-slate-500 dark:bg-slate-900/50 dark:text-slate-500"
                          }`}
                        >
                          {state.ingestion_status === "running" ? "Ingesting..." : state.ingestion_status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (isExpanded) {
                        setSelectedStateCode(null);
                      } else {
                        setSelectedStateCode(state.code);
                        void refreshTasks(state.code);
                        void refreshFlags(state.code);
                      }
                    }}
                    className={`inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      isExpanded
                        ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-50"
                        : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                    }`}
                  >
                    {isExpanded ? "Close" : "Manage"}
                  </button>
                </div>

                {/* Expanded Management Panel */}
                {isExpanded && (
                  <div className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 space-y-6">
                    {/* 1. Toggle Live Status */}
                    <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-3">
                      <div>
                        <h5 className="text-xs font-semibold text-slate-900 dark:text-slate-50">
                          State Visibility
                        </h5>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Enable this state for public users.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleState(state.code, !state.is_enabled)}
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                          state.is_enabled
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {state.is_enabled ? "Enabled" : "Disabled"}
                      </button>
                    </div>

                    {/* 2. Feature Flags */}
                    <div className="space-y-3">
                      <h5 className="text-xs font-semibold text-slate-900 dark:text-slate-50">
                        Feature Flags
                      </h5>
                      {flagsState.loading ? (
                        <p className="text-[11px] text-slate-500">Loading flags...</p>
                      ) : (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {[
                            { key: "complaints_enabled", label: "Complaints System" },
                            { key: "rti_enabled", label: "RTI System" },
                            { key: "ai_complaints_enabled", label: "AI Complaints" },
                            { key: "ai_rti_enabled", label: "AI RTI" },
                          ].map((flag) => {
                             const key = flag.key as FlagKey;
                             const isOn = flags && flags[key] === true;
                             return (
                               <button
                                 key={key}
                                 type="button"
                                 onClick={() => toggleFlag(state.code, key)}
                                 className={`flex items-center justify-between rounded-md border px-3 py-2 text-left text-xs transition-colors ${
                                   isOn
                                     ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                                     : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
                                 }`}
                               >
                                 <span className="font-medium text-slate-700 dark:text-slate-300">
                                   {flag.label}
                                 </span>
                                 <span
                                   className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] ${
                                     isOn
                                       ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400"
                                       : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500"
                                   }`}
                                 >
                                   {isOn ? "ON" : "OFF"}
                                 </span>
                               </button>
                             );
                          })}
                        </div>
                      )}
                    </div>

                    {/* 3. Ingestion Controls */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-semibold text-slate-900 dark:text-slate-50">
                          Data Ingestion
                        </h5>
                        {agentTaskState.message && (
                           <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                             {agentTaskState.message}
                           </span>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => runAgentTask(state.code)}
                          disabled={agentTaskState.loading}
                          className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                        >
                          {agentTaskState.loading ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              AI Agent Running...
                            </>
                          ) : (
                            <>✨ Auto-Fetch MLAs (AI)</>
                          )}
                        </button>
                        
                        {["politicians", "constituencies"].map((taskType) => (
                           <button
                             key={taskType}
                             type="button"
                             onClick={() => runTask(state.code, taskType)}
                             disabled={runTaskState.loadingTaskType === taskType}
                             className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                           >
                             {runTaskState.loadingTaskType === taskType && (
                               <Loader2 className="h-3 w-3 animate-spin" />
                             )}
                             Run {taskType}
                           </button>
                        ))}
                      </div>

                      {/* Ingestion Logs Table */}
                      <div className="mt-4 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-950">
                        <table className="min-w-full text-xs">
                          <thead className="bg-slate-50 dark:bg-slate-900/50">
                            <tr>
                              <th className="px-3 py-2 text-left font-medium text-slate-500 dark:text-slate-400">Task</th>
                              <th className="px-3 py-2 text-left font-medium text-slate-500 dark:text-slate-400">Status</th>
                              <th className="px-3 py-2 text-left font-medium text-slate-500 dark:text-slate-400">Updated</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                             {tasks?.map((task) => (
                               <tr key={task.id}>
                                 <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{task.task_type}</td>
                                 <td className="px-3 py-2">
                                   <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                                     task.status === "success" || task.status === "completed"
                                       ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                                       : task.status === "running"
                                       ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                                       : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                   }`}>
                                     {task.status}
                                   </span>
                                 </td>
                                 <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{task.updated_at ? new Date(task.updated_at).toLocaleDateString() : "-"}</td>
                               </tr>
                             ))}
                             {(!tasks || tasks.length === 0) && (
                               <tr>
                                 <td colSpan={3} className="px-3 py-4 text-center text-slate-500 dark:text-slate-400">
                                   No ingestion tasks recorded.
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
            );
          })}
        </div>
        
        {states.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No states configured. Use the form below to add one.
            </p>
          </div>
        )}
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
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-[11px] font-medium text-slate-50 disabled:opacity-60"
              disabled={addStateState.loading}
            >
              {addStateState.loading ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save state"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
