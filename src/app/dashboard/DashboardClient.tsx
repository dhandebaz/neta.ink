"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2, Check } from "lucide-react";

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
  title: string;
  department_name: string;
  status: string;
  photo_url: string;
  created_at: Date;
};

type DashboardRti = {
  id: number;
  question: string;
  status: string;
  pdf_url: string | null;
  created_at: Date;
};

type Props = {
  user: DashboardUser;
  complaints: DashboardComplaint[];
  rtis: DashboardRti[];
  activeStates?: { code: string; name: string }[];
};

type TabKey = "rtis" | "complaints" | "developer" | "settings";

function formatDate(value: Date): string {
  if (!(value instanceof Date)) {
    return "";
  }
  if (!Number.isFinite(value.getTime())) {
    return "";
  }
  return value.toLocaleDateString("en-IN");
}

export function DashboardClient({ user, complaints, rtis, activeStates }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("rtis");
  const [name, setName] = useState(user.name || "");
  const [stateCode, setStateCode] = useState(user.state_code || "DL");
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setShowSaved(false);
    try {
      const res = await fetch("/api/user/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, stateCode }),
      });
      if (res.ok) {
        setShowSaved(true);
        setTimeout(() => {
             window.location.reload();
        }, 1000);
      }
    } finally {
      setIsSaving(false);
    }
  };

  let userLabel = "citizen";
  if (user.name && user.name.trim().length > 0) {
    userLabel = user.name;
  } else if (user.phone_number && user.phone_number.length > 0) {
    userLabel = user.phone_number;
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: "rtis", label: "My RTIs" },
    { key: "complaints", label: "My complaints" },
    { key: "developer", label: "Developer API" },
    { key: "settings", label: "Profile" }
  ];

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
          <div className="grid grid-cols-4 gap-1">
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
            {rtis.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                You have not filed any RTIs yet.
              </p>
            ) : (
              <div className="space-y-3">
                {rtis.map((rti) => {
                  const createdLabel = formatDate(rti.created_at);
                  const hasPdf = Boolean(rti.pdf_url);

                  return (
                    <div
                      key={rti.id}
                      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 p-4 text-sm text-slate-800 dark:text-slate-100"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="line-clamp-2 text-sm font-medium">
                            {rti.question}
                          </div>
                          {createdLabel && (
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              Created on {createdLabel}
                            </div>
                          )}
                        </div>
                        <span className="inline-flex min-h-[24px] items-center rounded-full bg-slate-200 dark:bg-slate-800 px-2.5 py-0.5 text-[11px] font-medium text-slate-800 dark:text-slate-100">
                          {rti.status}
                        </span>
                      </div>
                      {rti.status === "paid" && (
                        <Link
                          href={`/rti/${rti.id}/document`}
                          className="mt-3 flex w-full items-center justify-center rounded-lg bg-slate-900 py-3 font-medium text-white hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200"
                        >
                          📄 View Document
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {activeTab === "settings" && (
          <section className="space-y-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-4">
                Profile Settings
              </h2>
              <form onSubmit={handleSave} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:placeholder-slate-500"
                    placeholder="Enter your full name"
                  />
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Used for your official RTI applications.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    My State
                  </label>
                  <select
                    value={stateCode}
                    onChange={(e) => setStateCode(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
                  >
                    {activeStates?.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex h-10 items-center justify-center rounded-full bg-slate-900 px-6 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-70 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    {isSaving ? (
                      <Loader2 className="animate-spin h-4 w-4" />
                    ) : (
                      "Save Changes"
                    )}
                  </button>
                  {showSaved && (
                    <span className="flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      <Check className="h-4 w-4" /> Saved!
                    </span>
                  )}
                </div>
              </form>
            </div>
          </section>
        )}

        {activeTab === "complaints" && (
          <section className="space-y-3">
            {complaints.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                You have not filed any complaints yet.
              </p>
            ) : (
              <div className="space-y-3">
                {complaints.map((c) => {
                  const createdLabel = formatDate(c.created_at);
                  const statusLower = c.status.toLowerCase();
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
                      <div className="flex items-start gap-3">
                        <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-900">
                          <Image
                            src={c.photo_url}
                            alt={c.title}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        </div>
                        <div className="flex flex-1 flex-col gap-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <div className="text-sm font-medium">
                                {c.title}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {c.department_name}
                              </div>
                            </div>
                            <span
                              className={
                                "inline-flex min-h-[24px] items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium " +
                                statusClass
                              }
                            >
                              {c.status}
                            </span>
                          </div>
                          {createdLabel && (
                            <div className="text-xs text-slate-500 dark:text-slate-500">
                              Created on {createdLabel}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {activeTab === "developer" && (
          <section className="space-y-3">
            {user.api_limit > 0 ? (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 p-4 text-sm text-slate-800 dark:text-slate-100">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                  Developer API access
                </h2>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Use this key to call the NetaInk Developer API from your services.
                </p>
                <div className="mt-4 rounded-xl bg-slate-100 dark:bg-slate-900/80 p-3 text-xs text-slate-800 dark:text-slate-100">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    API key
                  </div>
                  <div className="mt-1 break-all font-mono">
                    {user.api_key ?? ""}
                  </div>
                </div>
                <div className="mt-4 text-xs text-slate-600 dark:text-slate-300">
                  {user.api_calls_this_month.toLocaleString("en-IN")} /{" "}
                  {user.api_limit.toLocaleString("en-IN")} calls used
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 p-4 text-sm text-slate-800 dark:text-slate-100">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                  NetaInk Developer API
                </h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  NetaInk Developer API. Get programmatic access to all politician and civic data for ₹10,000/mo.
                </p>
                <button
                  type="button"
                  disabled
                  className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 px-4 text-sm font-semibold text-slate-500 dark:text-slate-400"
                >
                  Upgrade to Pro
                </button>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

