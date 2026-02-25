import { db } from "@/db/client";
import { complaints, rti_requests, users, states } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { AuthPhoneClient } from "@/components/AuthPhoneClient";
import { DashboardClient } from "./DashboardClient";

type DashboardUser = Pick<
  typeof users.$inferSelect,
  "id" | "name" | "phone_number" | "api_key" | "api_calls_this_month" | "api_limit" | "state_code"
>;

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

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-md space-y-4 text-center">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
            Sign in to view your civic dashboard
          </h1>
          <div className="mt-2 flex justify-center">
            <AuthPhoneClient />
          </div>
        </div>
      </div>
    );
  }

  const userId = user.id;

  const [userComplaints, userRtis, activeStates] = await Promise.all([
    db
      .select({
        id: complaints.id,
        title: complaints.title,
        department_name: complaints.department_name,
        status: complaints.status,
        photo_url: complaints.photo_url,
        created_at: complaints.created_at
      })
      .from(complaints)
      .where(eq(complaints.user_id, userId))
      .orderBy(desc(complaints.created_at)),
    db
      .select({
        id: rti_requests.id,
        question: rti_requests.question,
        status: rti_requests.status,
        pdf_url: rti_requests.pdf_url,
        created_at: rti_requests.created_at
      })
      .from(rti_requests)
      .where(eq(rti_requests.user_id, userId))
      .orderBy(desc(rti_requests.created_at)),
    db
      .select({ code: states.code, name: states.name })
      .from(states)
      .where(eq(states.is_enabled, true))
  ]);

  const dashboardUser: DashboardUser = {
    id: user.id,
    name: user.name,
    phone_number: user.phone_number,
    api_key: user.api_key ?? null,
    api_calls_this_month: user.api_calls_this_month ?? 0,
    api_limit: user.api_limit ?? 0,
    state_code: user.state_code ?? null
  };

  const complaintsData: DashboardComplaint[] = userComplaints.map((c) => ({
    id: c.id,
    title: c.title,
    department_name: c.department_name,
    status: c.status,
    photo_url: c.photo_url,
    created_at: c.created_at
  }));

  const rtisData: DashboardRti[] = userRtis.map((r) => ({
    id: r.id,
    question: r.question,
    status: r.status,
    pdf_url: r.pdf_url,
    created_at: r.created_at
  }));

  return (
    <DashboardClient
      user={dashboardUser}
      complaints={complaintsData}
      rtis={rtisData}
      activeStates={activeStates}
    />
  );
}
