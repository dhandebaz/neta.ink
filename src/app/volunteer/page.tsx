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
    <div className="space-y-8">
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50 sm:text-3xl">
          Civic Leaderboard
        </h1>
        <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300 sm:text-base">
          See the most active NetaInk volunteers driving local change through verified civic
          tasks.
        </p>
        {!isVolunteer && (
          <div className="rounded-3xl border border-emerald-500/40 bg-emerald-500/10 p-4 sm:p-5">
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">
                  Join the Ground Game. Become a NetaInk Volunteer.
                </h2>
                <p className="mt-1 text-xs text-emerald-800/90 dark:text-emerald-100/90 sm:text-sm">
                  Verified citizens can claim civic tasks, support neighbours, and earn points on
                  the public volunteer leaderboard.
                </p>
              </div>
              <Link
                href="/volunteer/dashboard"
                className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400"
              >
                Go to volunteer dashboard
              </Link>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
          Top volunteers
        </h2>
        {leaderboard.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            As tasks go live and citizens start contributing, top volunteers will appear here.
          </p>
        ) : (
          <ol className="space-y-3">
            {leaderboard.map((row, index) => {
              const name = row.name && row.name.trim().length > 0 ? row.name : "Citizen";

              return (
                <li
                  key={row.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 px-4 py-3 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100">
                      {index + 1}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900 dark:text-slate-50">
                        {name}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {row.contribution_points} points
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
