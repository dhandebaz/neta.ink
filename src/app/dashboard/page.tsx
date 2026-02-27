import { db } from "@/db/client";
import { complaints, rti_requests, users, politicians } from "@/db/schema";
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

  const [userComplaints, userRtis] = await Promise.all([
    db
      .select({
        id: complaints.id,
        title: complaints.title,
        location_text: complaints.location_text,
        status: complaints.status,
        created_at: complaints.created_at
      })
      .from(complaints)
      .where(eq(complaints.user_id, userId))
      .orderBy(desc(complaints.created_at)),
    db
      .select({
        id: rti_requests.id,
        status: rti_requests.status,
        created_at: rti_requests.created_at,
        pdf_url: rti_requests.pdf_url,
        politician_name: politicians.name,
        politician_position: politicians.position
      })
      .from(rti_requests)
      .leftJoin(politicians, eq(politicians.id, rti_requests.politician_id))
      .where(eq(rti_requests.user_id, userId))
      .orderBy(desc(rti_requests.created_at)),
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
    complaint_type: c.title,
    location_text: c.location_text,
    status: c.status,
    created_at: c.created_at
  }));

  const rtisData: DashboardRti[] = userRtis.map((r) => ({
    id: r.id,
    target_official:
      r.politician_name && r.politician_name.trim().length > 0
        ? `${r.politician_position || "MLA"} ${r.politician_name}`
        : "Public Information Officer",
    status: r.status,
    download_url: r.pdf_url && r.pdf_url.trim().length > 0 ? r.pdf_url : `/api/rti/${r.id}/pdf`,
    created_at: r.created_at
  }));

  return (
    <DashboardClient
      user={dashboardUser}
      complaints={complaintsData}
      rtis={rtisData}
    />
  );
}
