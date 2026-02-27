import { db } from "@/db/client";
import { users, volunteers } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";

type LeaderboardRow = {
  id: number;
  name: string | null;
  contribution_points: number;
};

export const dynamic = "force-dynamic";

export default async function VolunteerPage() {
  const currentUser = await getCurrentUser();

  const [rows, volunteerForUser] = await Promise.all([
    db
      .select({
        id: volunteers.id,
        name: users.name,
        contribution_points: volunteers.contribution_points
      })
      .from(volunteers)
      .innerJoin(users, eq(users.id, volunteers.user_id))
      .orderBy(desc(volunteers.contribution_points), desc(volunteers.created_at))
      .limit(20),
    currentUser
      ? db
          .select({ id: volunteers.id })
          .from(volunteers)
          .where(eq(volunteers.user_id, currentUser.id))
          .limit(1)
      : Promise.resolve([])
  ]);

  const leaderboard: LeaderboardRow[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    contribution_points: row.contribution_points
  }));

  const isVolunteer = Boolean(currentUser && volunteerForUser.length > 0);

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 px-6 py-16 text-center shadow-2xl sm:px-16 md:py-24">
        <div className="relative z-10 mx-auto max-w-3xl space-y-6">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            Neta.ink Volunteer & State Manager Portal
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-slate-300">
            Help us keep democracy transparent. Apply to become a State Manager to verify local news, flag fake reports, and manage politician data for your constituency.
          </p>
          <div className="flex justify-center pt-4">
            <button className="opacity-50 cursor-not-allowed bg-slate-800 text-slate-400 px-8 py-3 rounded-full font-medium border border-slate-700">
              Apply for State Manager (Coming Soon)
            </button>
          </div>
        </div>
        
        {/* Abstract Background Pattern */}
        <div className="absolute top-0 left-0 -z-0 h-full w-full opacity-20">
          <div className="absolute right-0 top-0 h-[500px] w-[500px] -translate-y-1/2 translate-x-1/2 rounded-full bg-emerald-500/30 blur-[100px]" />
          <div className="absolute left-0 bottom-0 h-[500px] w-[500px] translate-y-1/2 -translate-x-1/2 rounded-full bg-blue-500/30 blur-[100px]" />
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content / Leaderboard */}
        <div className="lg:col-span-2 space-y-8">
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
              Civic Leaderboard
            </h2>
            <p className="text-slate-600 dark:text-slate-300">
              See the most active NetaInk volunteers driving local change through verified civic tasks.
            </p>
            
            {!isVolunteer && (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-50 dark:bg-emerald-900/10 p-6">
                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-emerald-800 dark:text-emerald-300">
                      Join the Ground Game
                    </h3>
                    <p className="mt-1 text-sm text-emerald-700/80 dark:text-emerald-400/80">
                      Verified citizens can claim civic tasks and earn points.
                    </p>
                  </div>
                  <Link
                    href="/volunteer/dashboard"
                    className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors shadow-sm"
                  >
                    Go to Dashboard
                  </Link>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              {leaderboard.length === 0 ? (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                  As tasks go live and citizens start contributing, top volunteers will appear here.
                </div>
              ) : (
                <ol className="divide-y divide-slate-100 dark:divide-slate-800">
                  {leaderboard.map((row, index) => {
                    const name = row.name && row.name.trim().length > 0 ? row.name : "Citizen";
                    return (
                      <li
                        key={row.id}
                        className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                            index < 3 
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" 
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          }`}>
                            {index + 1}
                          </div>
                          <span className="font-medium text-slate-900 dark:text-slate-50">
                            {name}
                          </span>
                        </div>
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                          {row.contribution_points} pts
                        </span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <h3 className="font-semibold text-slate-900 dark:text-white">Why become a State Manager?</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-400">
              <li className="flex gap-2">
                <span className="text-emerald-500">✓</span>
                Verify local news before it goes viral
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500">✓</span>
                Manage and update politician profiles
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500">✓</span>
                Directly impact transparency in your state
              </li>
            </ul>
          </div>
          
          <div className="rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-6 text-white shadow-lg">
            <h3 className="font-bold">NetaInk Community</h3>
            <p className="mt-2 text-sm text-indigo-100">
              Join thousands of citizens working together to build a more transparent democracy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
