import { db } from "@/db/client";
import { states } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { MapPin, Search } from "lucide-react";
import { WaitlistFormClient } from "@/components/WaitlistFormClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Neta.ink | The Civic Accountability Engine",
};

export default async function HomePage() {
  const activeStates = await db.select().from(states).where(eq(states.is_enabled, true));
  const inactiveStates = await db.select({ code: states.code, name: states.name }).from(states).where(eq(states.is_enabled, false)).orderBy(states.name);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center space-y-10 px-4 py-12 text-center">
      <div className="space-y-4 max-w-3xl">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 sm:text-6xl">
          Hold your representatives <span className="text-emerald-600">accountable.</span>
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-300">
          Select your state to view politician rankings, file civic complaints, and draft instant RTIs using our autonomous AI platform.
        </p>
      </div>

      <div className="w-full max-w-xl text-left">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4 ml-2">Available States</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {activeStates.length > 0 ? activeStates.map((state) => (
            <Link
              key={state.code}
              href={`/rankings/${state.code.toLowerCase()}`}
              className="group relative flex items-center justify-between overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 transition-all hover:border-emerald-500 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-50 group-hover:text-emerald-600">{state.name}</div>
                  <div className="text-xs text-slate-500">{state.primary_city_label || 'State Assembly'}</div>
                </div>
              </div>
              <Search className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-emerald-500" />
            </Link>
          )) : (
            <div className="col-span-2 text-center text-sm text-slate-500 py-8">
              No states are currently active. System admins can enable them in the dashboard.
            </div>
          )}
        </div>
      </div>

      <div className="w-full max-w-xl text-left mt-12 border-t border-slate-200 dark:border-slate-800 pt-12">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4 ml-2">Coming Soon</h2>
        <WaitlistFormClient inactiveStates={inactiveStates} />
      </div>
    </div>
  );
}
