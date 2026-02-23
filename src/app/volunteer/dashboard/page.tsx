import { db } from "@/db/client";
import { civic_tasks, states, volunteers } from "@/db/schema";
import { and, desc, eq, isNull, or } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { AuthPhoneClient } from "@/components/AuthPhoneClient";

export const dynamic = "force-dynamic";

export default async function VolunteerDashboardPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-md space-y-4 text-center">
          <h1 className="text-2xl font-semibold text-slate-50">
            Sign in to access your volunteer dashboard
          </h1>
          <div className="mt-2 flex justify-center">
            <AuthPhoneClient />
          </div>
        </div>
      </div>
    );
  }

  const [stateRow] = await db
    .select()
    .from(states)
    .where(eq(states.code, currentUser.state_code))
    .limit(1);

  if (!stateRow) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4">
        <div className="w-full max-w-lg space-y-3 text-center">
          <h1 className="text-xl font-semibold text-slate-50">
            State configuration missing
          </h1>
          <p className="text-sm text-slate-300">
            Your account is set to a state that is not yet configured for volunteer tasks. Try
            updating your state in the header or contact support.
          </p>
        </div>
      </div>
    );
  }

  const [volunteer] = await db
    .select()
    .from(volunteers)
    .where(eq(volunteers.user_id, currentUser.id))
    .limit(1);

  if (!currentUser.voter_id_verified) {
    return (
      <div className="space-y-6">
        <section className="space-y-3">
          <h1 className="text-2xl font-semibold text-slate-50 sm:text-3xl">
            Become a verified NetaInk volunteer
          </h1>
          <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
            To protect the integrity of civic actions, only citizens with a verified Voter ID
            can join the volunteer network and claim tasks.
          </p>
        </section>
        <section>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5">
            <p className="text-sm text-slate-200">
              Verify your Voter ID in your account to unlock volunteer tools, local tasks, and
              leaderboard points.
            </p>
          </div>
        </section>
      </div>
    );
  }

  if (!volunteer) {
    return (
      <div className="space-y-8">
        <section className="space-y-3">
          <h1 className="text-2xl font-semibold text-slate-50 sm:text-3xl">
            Join the volunteer network
          </h1>
          <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
            Register once to become a NetaInk volunteer for your state. Your profile stays
            linked to your verified identity.
          </p>
        </section>
        <section>
          <div className="rounded-3xl border border-emerald-500/40 bg-emerald-500/10 p-4 sm:p-5">
            <form action="/api/volunteers/register" method="POST">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400"
              >
                Register as volunteer
              </button>
            </form>
          </div>
        </section>
      </div>
    );
  }

  const [activeTasks, openTasks] = await Promise.all([
    db
      .select({
        id: civic_tasks.id,
        title: civic_tasks.title,
        description: civic_tasks.description,
        points_reward: civic_tasks.points_reward,
        status: civic_tasks.status
      })
      .from(civic_tasks)
      .where(
        and(
          eq(civic_tasks.assigned_to, volunteer.id),
          eq(civic_tasks.status, "in_progress")
        )
      )
      .orderBy(desc(civic_tasks.created_at)),
    db
      .select({
        id: civic_tasks.id,
        title: civic_tasks.title,
        description: civic_tasks.description,
        points_reward: civic_tasks.points_reward,
        status: civic_tasks.status,
        state_id: civic_tasks.state_id
      })
      .from(civic_tasks)
      .where(
        and(
          eq(civic_tasks.status, "open"),
          or(isNull(civic_tasks.state_id), eq(civic_tasks.state_id, stateRow.id))
        )
      )
      .orderBy(desc(civic_tasks.created_at))
  ]);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold text-slate-50 sm:text-3xl">
          Volunteer dashboard
        </h1>
        <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
          Claim civic tasks, track your active work, and earn contribution points that appear
          on the public volunteer leaderboard.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-50">
          My active tasks
        </h2>
        {activeTasks.length === 0 ? (
          <p className="text-sm text-slate-400">
            You have no tasks in progress. Browse open tasks below to claim your first one.
          </p>
        ) : (
          <div className="space-y-3">
            {activeTasks.map((task) => (
              <div
                key={task.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-100"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-50">
                      {task.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-300">
                      {task.description}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
                      {task.points_reward} points
                    </span>
                    <span className="text-[11px] uppercase tracking-wide text-emerald-300">
                      In progress
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-50">
          Open tasks in your state
        </h2>
        {openTasks.length === 0 ? (
          <p className="text-sm text-slate-400">
            There are no open tasks for your state right now. Check back soon as new work is
            added.
          </p>
        ) : (
          <div className="space-y-3">
            {openTasks.map((task) => (
              <form
                key={task.id}
                action={`/api/volunteers/tasks/${task.id}/claim`}
                method="POST"
                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-100"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-50">
                      {task.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-300">
                      {task.description}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
                      {task.points_reward} points
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-400">
                    {task.state_id ? "Task for your state" : "Open to volunteers nationwide"}
                  </span>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-xs font-medium text-slate-950 hover:bg-emerald-400"
                  >
                    Claim task
                  </button>
                </div>
              </form>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
