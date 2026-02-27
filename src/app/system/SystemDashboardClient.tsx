"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatesAdminClient } from "./StatesAdminClient";
import { AiFlagsClient } from "./AiFlagsClient";
import { Users, Settings, RefreshCw } from "lucide-react";

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
  totalAiRequests: number;
  totalComplaintsCreated: number;
  totalRtisCreated: number;
  totalRateLimited: number;
};

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "state-engine", label: "State Engine" },
  { id: "ai-controls", label: "AI Controls" },
  { id: "users", label: "User & Roles", icon: <Users className="h-4 w-4" /> },
  { id: "settings", label: "Website Settings", icon: <Settings className="h-4 w-4" /> },
  { id: "live-logs", label: "Live Logs" },
];

export function SystemDashboardClient({
  delhiCounts,
  stateSummaries,
  latestEvents,
  aiRtiEnabled,
  aiComplaintsEnabled,
  adminUserId,
  totalAiRequests,
  totalComplaintsCreated,
  totalRtisCreated,
  totalRateLimited,
}: SystemDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

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

        <nav className="flex flex-row space-x-2 overflow-x-auto whitespace-nowrap md:flex-col md:space-x-0 md:space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
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
        <div className="mb-6 flex items-center justify-end">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh Data
          </button>
        </div>

        {activeTab === "overview" && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Overview
            </h1>
            
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* AI & Usage Stats */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Total AI Requests
                </h3>
                <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                  {totalAiRequests}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Rate Limited
                </h3>
                <p className="mt-2 text-3xl font-bold text-amber-600 dark:text-amber-400">
                  {totalRateLimited}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Global Complaints
                </h3>
                <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                  {totalComplaintsCreated}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Global RTIs
                </h3>
                <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                  {totalRtisCreated}
                </p>
              </div>

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

        {activeTab === "users" && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Role Management
            </h1>
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                <Users className="mx-auto mb-3 h-8 w-8 opacity-20" />
                <p>State Manager roles and permissions coming in V2.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Website Settings
            </h1>
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-slate-900 dark:text-white">Maintenance Mode</h3>
                    <p className="text-sm text-slate-500">Disable public access temporarily</p>
                  </div>
                  <div className="h-6 w-11 rounded-full bg-slate-200 dark:bg-slate-800"></div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-slate-900 dark:text-white">API Rate Limiting</h3>
                    <p className="text-sm text-slate-500">Enforce strict limits on public endpoints</p>
                  </div>
                  <div className="h-6 w-11 rounded-full bg-emerald-500"></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "live-logs" && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Live Logs
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              View recent system activities and API requests.
            </p>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              {!latestEvents || latestEvents.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  No recent API events logged.
                </div>
              ) : (
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
                            {new Date(event.created_at).toLocaleString()}
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
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
