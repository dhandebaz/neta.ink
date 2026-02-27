"use client";

import { useState } from "react";
import Link from "next/link";

type DashboardUser = {
  id: number;
  name: string | null;
  phone_number: string;
  api_key: string | null;
  api_calls_this_month: number;
  api_limit: number;
  state_code?: string | null;
};

type DashboardComplaint = {
  id: number;
  complaint_type: string;
  location_text: string;
  status: string;
  created_at: Date;
};

type DashboardRti = {
  id: number;
  target_official: string;
  status: string;
  download_url: string;
  created_at: Date;
};

type Props = {
  user: DashboardUser;
  complaints: DashboardComplaint[];
  rtis: DashboardRti[];
};

type TabKey = "rtis" | "complaints";

function formatDate(value: Date): string {
  if (!(value instanceof Date)) {
    return "";
  }
  if (!Number.isFinite(value.getTime())) {
    return "";
  }
  return value.toLocaleDateString("en-IN");
}

export function EmptyState() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
      <div className="mx-auto max-w-md space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
          You haven&apos;t filed any civic actions yet.
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Hold your leaders accountable today.
        </p>
        <div className="pt-2">
          <Link
            href="/tools"
            className="inline-flex h-11 items-center justify-center rounded-full bg-slate-900 px-6 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            Go to Civic Store
          </Link>
        </div>
      </div>
    </div>
  );
}

export function DashboardClient({ user, complaints, rtis }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("rtis");

  let userLabel = "citizen";
  if (user.name && user.name.trim().length > 0) {
    userLabel = user.name;
  } else if (user.phone_number && user.phone_number.length > 0) {
    userLabel = user.phone_number;
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: "rtis", label: "My RTIs" },
    { key: "complaints", label: "My Complaints" }
  ];

  const hasAnyActions = rtis.length > 0 || complaints.length > 0;

  return (
    <div className="px-4 pb-8 pt-4">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
            My civic dashboard
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {userLabel}
          </p>
        </header>

        <div className="rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 p-1 text-xs text-slate-800 dark:text-slate-100">
          <div className="grid grid-cols-2 gap-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={
                    "inline-flex h-10 w-full items-center justify-center rounded-full px-2 font-medium transition-colors " +
                    (isActive
                      ? "bg-slate-200 dark:bg-slate-100 text-slate-900"
                      : "bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900/60")
                  }
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === "rtis" && (
          <section className="space-y-3">
            {!hasAnyActions ? (
              <EmptyState />
            ) : rtis.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-300">
                No RTIs yet.
              </div>
            ) : (
              <div className="space-y-3">
                {rtis.map((rti) => {
                  const createdLabel = formatDate(rti.created_at);
                  const statusLower = (rti.status || "").toLowerCase();
                  const statusLabel =
                    statusLower === "draft"
                      ? "Drafted"
                      : statusLower === "paid"
                      ? "Mailed"
                      : "Awaiting Response";

                  const statusClass =
                    statusLower === "draft"
                      ? "border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200"
                      : statusLower === "paid"
                      ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200";

                  return (
                    <div
                      key={rti.id}
                      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 p-4 text-sm text-slate-800 dark:text-slate-100"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="line-clamp-1 text-sm font-semibold text-slate-900 dark:text-slate-50">
                            {rti.target_official}
                          </div>
                          {createdLabel && (
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {createdLabel}
                            </div>
                          )}
                        </div>
                        <span className={`inline-flex min-h-[24px] items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusClass}`}>
                          {statusLabel}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <Link
                          href={rti.download_url}
                          className="flex w-full items-center justify-center rounded-lg bg-slate-900 py-3 font-medium text-white hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200"
                        >
                          Download PDF
                        </Link>
                        <Link
                          href={`/rti/${rti.id}/document`}
                          className="flex w-full items-center justify-center rounded-lg border border-slate-200 bg-white py-3 font-medium text-slate-800 hover:border-amber-400 hover:text-amber-700 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:hover:text-amber-200"
                        >
                          View Draft
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {activeTab === "complaints" && (
          <section className="space-y-3">
            {!hasAnyActions ? (
              <EmptyState />
            ) : complaints.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-300">
                No complaints yet.
              </div>
            ) : (
              <div className="space-y-3">
                {complaints.map((c) => {
                  const createdLabel = formatDate(c.created_at);
                  const statusLower = c.status.toLowerCase();
                  const statusLabel =
                    statusLower === "pending"
                      ? "Open"
                      : statusLower === "filed"
                      ? "In Progress"
                      : statusLower === "resolved"
                      ? "Resolved"
                      : "Open";

                  let statusClass =
                    "bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-100";
                  if (statusLower === "pending") {
                    statusClass = "bg-amber-400 text-slate-950";
                  } else if (statusLower === "filed" || statusLower === "resolved") {
                    statusClass = "bg-emerald-500 text-slate-950";
                  }

                  return (
                    <div
                      key={c.id}
                      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 p-4 text-sm text-slate-800 dark:text-slate-100"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="line-clamp-1 text-sm font-semibold text-slate-900 dark:text-slate-50">
                            {c.complaint_type}
                          </div>
                          <div className="line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                            {c.location_text}
                          </div>
                          {createdLabel && (
                            <div className="text-xs text-slate-500 dark:text-slate-500">
                              {createdLabel}
                            </div>
                          )}
                        </div>
                        <span
                          className={
                            "inline-flex min-h-[24px] items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium " +
                            statusClass
                          }
                        >
                          {statusLabel}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
