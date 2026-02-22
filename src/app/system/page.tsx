import { db } from "@/db/client";
import {
  complaints,
  constituencies,
  rti_requests,
  states,
  users,
  politicians,
  usage_events
} from "@/db/schema";
import { desc, eq, gte } from "drizzle-orm";
import { AdminActionsClient } from "./AdminActionsClient";

type PageProps = {
  searchParams?: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
};

export default async function SystemPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const rawAdminId =
    typeof params.adminUserId === "string" ? params.adminUserId : undefined;

  const parsedAdminId = rawAdminId ? Number(rawAdminId) : NaN;
  const adminUserId =
    Number.isFinite(parsedAdminId) && parsedAdminId > 0
      ? parsedAdminId
      : null;

  if (!adminUserId) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-xl text-center space-y-2">
          <h1 className="text-2xl font-bold">System Admin</h1>
          <p className="text-sm text-red-600">Access denied</p>
        </div>
      </main>
    );
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, adminUserId))
    .limit(1);

  if (!user || !user.is_system_admin) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-xl text-center space-y-2">
          <h1 className="text-2xl font-bold">System Admin</h1>
          <p className="text-sm text-red-600">Access denied</p>
        </div>
      </main>
    );
  }

  const [delhi] = await db
    .select()
    .from(states)
    .where(eq(states.code, "DL"))
    .limit(1);

  let delhiCounts:
    | {
        constituencies: number;
        politicians: number;
        complaints: number;
        rtiRequests: number;
        users: number;
      }
    | null = null;

  if (delhi) {
    const [constituencyRows, politicianRows, complaintRows, rtiRows, userRows] =
      await Promise.all([
        db
          .select({ id: constituencies.id })
          .from(constituencies)
          .where(eq(constituencies.state_id, delhi.id)),
        db
          .select({ id: politicians.id })
          .from(politicians)
          .where(eq(politicians.state_id, delhi.id)),
        db
          .select({ id: complaints.id })
          .from(complaints)
          .where(eq(complaints.state_id, delhi.id)),
        db
          .select({ id: rti_requests.id })
          .from(rti_requests)
          .where(eq(rti_requests.state_id, delhi.id)),
        db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.state_code, "DL"))
      ]);

    delhiCounts = {
      constituencies: constituencyRows.length,
      politicians: politicianRows.length,
      complaints: complaintRows.length,
      rtiRequests: rtiRows.length,
      users: userRows.length
    };
  }

  const now = new Date();
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const recentEvents = await db
    .select({
      id: usage_events.id,
      user_id: usage_events.user_id,
      task_type: usage_events.task_type,
      state_code: usage_events.state_code,
      endpoint: usage_events.endpoint,
      success: usage_events.success,
      status_code: usage_events.status_code,
      created_at: usage_events.created_at
    })
    .from(usage_events)
    .where(gte(usage_events.created_at, since))
    .orderBy(desc(usage_events.created_at));

  const totalAiRequests = recentEvents.filter(
    (event) =>
      event.task_type === "complaint_analyze" || event.task_type === "rti_draft"
  ).length;

  const totalComplaintsCreated = recentEvents.filter(
    (event) =>
      event.task_type === "complaint_create" &&
      event.success &&
      event.status_code === 200
  ).length;

  const totalRtisCreated = recentEvents.filter(
    (event) =>
      event.task_type === "rti_create" &&
      event.success &&
      event.status_code === 200
  ).length;

  const totalRateLimited = recentEvents.filter(
    (event) => event.status_code === 429
  ).length;

  const latestEvents = recentEvents.slice(0, 50);

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-8">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold">System Admin</h1>
          <p className="text-sm text-slate-600">
            Internal view for Delhi state status and core data.
          </p>
          <p className="text-xs text-slate-500">
            Signed in as admin user ID {adminUserId}
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Delhi State Status</h2>
          {!delhi ? (
            <p className="text-sm text-red-600">
              Delhi not initialized. Run ensureDelhiState in backend utilities
              or via an admin task before using ingestion and seeding.
            </p>
          ) : (
            <div className="border rounded-lg p-3 text-sm text-left space-y-1">
              <div>
                <span className="font-semibold">Code:</span> {delhi.code}
              </div>
              <div>
                <span className="font-semibold">Name:</span> {delhi.name}
              </div>
              <div>
                <span className="font-semibold">Enabled:</span>{" "}
                {delhi.is_enabled ? "Yes" : "No"}
              </div>
              <div>
                <span className="font-semibold">Ingestion status:</span>{" "}
                {delhi.ingestion_status}
              </div>
              <div>
                <span className="font-semibold">Created at:</span>{" "}
                {delhi.created_at?.toISOString() ?? "Unknown"}
              </div>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Data Overview</h2>
          {!delhi || !delhiCounts ? (
            <p className="text-sm text-slate-600">
              Delhi state not initialized; counts are not available yet.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
              <div className="border rounded-lg p-3 text-left">
                <div className="font-semibold">Constituencies (Delhi)</div>
                <div className="text-2xl font-bold">
                  {delhiCounts.constituencies}
                </div>
              </div>
              <div className="border rounded-lg p-3 text-left">
                <div className="font-semibold">Politicians (Delhi)</div>
                <div className="text-2xl font-bold">
                  {delhiCounts.politicians}
                </div>
              </div>
              <div className="border rounded-lg p-3 text-left">
                <div className="font-semibold">Complaints (Delhi)</div>
                <div className="text-2xl font-bold">
                  {delhiCounts.complaints}
                </div>
              </div>
              <div className="border rounded-lg p-3 text-left">
                <div className="font-semibold">RTI Requests (Delhi)</div>
                <div className="text-2xl font-bold">
                  {delhiCounts.rtiRequests}
                </div>
              </div>
              <div className="border rounded-lg p-3 text-left">
                <div className="font-semibold">Users (state_code = DL)</div>
                <div className="text-2xl font-bold">
                  {delhiCounts.users}
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Usage and Limits (last 24 hours)</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <div className="border rounded-lg p-3 text-left">
              <div className="font-semibold">AI requests (RTI + complaints)</div>
              <div className="text-2xl font-bold">{totalAiRequests}</div>
            </div>
            <div className="border rounded-lg p-3 text-left">
              <div className="font-semibold">Complaints created</div>
              <div className="text-2xl font-bold">{totalComplaintsCreated}</div>
            </div>
            <div className="border rounded-lg p-3 text-left">
              <div className="font-semibold">RTIs created</div>
              <div className="text-2xl font-bold">{totalRtisCreated}</div>
            </div>
            <div className="border rounded-lg p-3 text-left">
              <div className="font-semibold">429 responses</div>
              <div className="text-2xl font-bold">{totalRateLimited}</div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Latest usage events</h3>
            {latestEvents.length === 0 ? (
              <p className="text-xs text-slate-600">
                No usage events recorded in the last 24 hours.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">
                        Time
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">
                        User
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">
                        Task
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">
                        State
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">
                        Endpoint
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestEvents.map((event) => (
                      <tr key={event.id} className="border-t">
                        <td className="px-3 py-2 align-top text-slate-800">
                          {event.created_at?.toISOString() ?? ""}
                        </td>
                        <td className="px-3 py-2 align-top text-slate-800">
                          {event.user_id ?? "anon"}
                        </td>
                        <td className="px-3 py-2 align-top text-slate-800">
                          {event.task_type}
                        </td>
                        <td className="px-3 py-2 align-top text-slate-800">
                          {event.state_code ?? ""}
                        </td>
                        <td className="px-3 py-2 align-top text-slate-800">
                          {event.endpoint}
                        </td>
                        <td className="px-3 py-2 align-top">
                          <span
                            className={
                              event.success
                                ? "inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700"
                                : "inline-flex rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700"
                            }
                          >
                            {event.success ? "success" : `error ${event.status_code}`}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Actions</h2>
          <p className="text-xs text-slate-600">
            These actions call the existing admin APIs for Delhi ingestion and core seeding.
          </p>
          <AdminActionsClient adminUserId={adminUserId} />
        </section>
      </div>
    </main>
  );
}
