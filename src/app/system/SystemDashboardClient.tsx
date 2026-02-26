"use client";

import { useState } from "react";
import { StatesAdminClient } from "./StatesAdminClient";
import { AiFlagsClient } from "./AiFlagsClient";

type SystemDashboardProps = {
  delhiCounts: {
    constituencies: number;
    politicians: number;
    complaints: number;
    rtiRequests: number;
    users: number;
  } | null;
  stateSummaries: any[];
  latestEvents: any[];
  aiRtiEnabled: boolean;
  aiComplaintsEnabled: boolean;
  adminUserId: number;
};

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "state-engine", label: "State Engine" },
  { id: "ai-controls", label: "AI Controls" },
  { id: "live-logs", label: "Live Logs" },
];

export function SystemDashboardClient({
  delhiCounts,
  stateSummaries,
  latestEvents,
  aiRtiEnabled,
  aiComplaintsEnabled,
  adminUserId,
}: SystemDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full border-b border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 md:w-64 md:border-b-0 md:border-r">
        <div className="mb-8 hidden md:block">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            System Admin
          </h2>
          <p className="text-xs text-slate-500">ID: {adminUserId}</p>
        </div>

        <nav className="flex space-x-2 overflow-x-auto md:flex-col md:space-x-0 md:space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-slate-50 p-4 dark:bg-slate-900 sm:p-8">
        {activeTab === "overview" && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Overview
            </h1>
            
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Delhi Stats Card */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Delhi Users
                </h3>
                <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                  {delhiCounts?.users ?? 0}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Politicians
                </h3>
                <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                  {delhiCounts?.politicians ?? 0}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Complaints
                </h3>
                <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                  {delhiCounts?.complaints ?? 0}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  RTI Requests
                </h3>
                <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                  {delhiCounts?.rtiRequests ?? 0}
                </p>
              </div>
            </div>

            {!delhiCounts && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
                Delhi state not initialized. Run ensureDelhiState backend utility.
              </div>
            )}
          </div>
        )}

        {activeTab === "state-engine" && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              State Engine
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Manage state activation and ingestion tasks.
            </p>
            <StatesAdminClient
              adminUserId={adminUserId}
              initialStates={stateSummaries}
            />
          </div>
        )}

        {activeTab === "ai-controls" && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              AI Controls
            </h1>
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <AiFlagsClient
                adminUserId={adminUserId}
                initialAiRtiEnabled={aiRtiEnabled}
                initialAiComplaintsEnabled={aiComplaintsEnabled}
              />
            </div>
          </div>
        )}

        {activeTab === "live-logs" && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Live Logs
            </h1>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-3 font-medium">Time</th>
                      <th className="px-4 py-3 font-medium">User</th>
                      <th className="px-4 py-3 font-medium">Task</th>
                      <th className="px-4 py-3 font-medium">Endpoint</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {latestEvents.map((event) => (
                      <tr key={event.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">
                          {new Date(event.created_at).toLocaleTimeString()}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">
                          {event.user_id}
                        </td>
                        <td className="px-4 py-3 text-slate-900 dark:text-white">
                          {event.task_type}
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-mono text-xs">
                          {event.endpoint}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              event.success
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            }`}
                          >
                            {event.status_code}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
