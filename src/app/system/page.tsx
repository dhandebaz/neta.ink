import { Suspense } from "react";
import { Loader2 } from "lucide-react";
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
import { SystemDashboardClient } from "./SystemDashboardClient";
import { isAiComplaintsEnabled, isAiRtiEnabled } from "@/lib/ai/flags";

import { getCurrentUser } from "@/lib/auth/session";

async function SystemDashboardContent() {
  const user = await getCurrentUser();

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

  const adminUserId = user.id;
  const allStatesRows = await db.select().from(states);

  const delhi = allStatesRows.find((row) => row.code === "DL") ?? null;

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

  const stateSummaries = allStatesRows
    .map((row) => ({
      code: row.code,
      name: row.name,
      is_enabled: row.is_enabled,
      ingestion_status: row.ingestion_status,
      primary_city_label: row.primary_city_label ?? null
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

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

  const [aiRtiEnabled, aiComplaintsEnabled] = await Promise.all([
    isAiRtiEnabled(),
    isAiComplaintsEnabled()
  ]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <SystemDashboardClient
        delhiCounts={delhiCounts}
        stateSummaries={stateSummaries}
        latestEvents={latestEvents}
        aiRtiEnabled={aiRtiEnabled}
        aiComplaintsEnabled={aiComplaintsEnabled}
        adminUserId={adminUserId}
        totalAiRequests={totalAiRequests}
        totalComplaintsCreated={totalComplaintsCreated}
        totalRtisCreated={totalRtisCreated}
        totalRateLimited={totalRateLimited}
      />
    </div>
  );
}

export default function SystemPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
            <p className="text-sm text-slate-500 font-medium">Loading system dashboard...</p>
          </div>
        </div>
      }
    >
      <SystemDashboardContent />
    </Suspense>
  );
}
