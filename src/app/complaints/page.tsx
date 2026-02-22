import type { Metadata } from "next";
import { db } from "@/db/client";
import { complaints, constituencies, politicians, states } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { ComplaintClient } from "./ComplaintClient";
import { getFeatureFlagBoolean } from "@/lib/states";

export const metadata: Metadata = {
  title: "Complaints — Delhi (India-wide soon) · neta",
  description:
    "File and browse civic complaints that reach the right Delhi civic bodies today. neta is built for India-wide rollout, starting with Delhi.",
  openGraph: {
    type: "website",
    url: "https://neta.ink/complaints",
    title: "Complaints — Delhi (India-wide soon) · neta",
    description:
      "Use neta to turn photos and locations into civic complaints that reach the right Delhi civic bodies. Built for India-wide rollout.",
    images: ["/og-default.jpg"]
  },
  alternates: {
    canonical: "https://neta.ink/complaints"
  }
};

type PageProps = {
  searchParams?: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
};

export default async function ComplaintsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const complaintsEnabledGlobal = await getFeatureFlagBoolean(
    "complaints_enabled_global",
    true
  );
  const complaintsEnabledDelhi = await getFeatureFlagBoolean(
    "complaints_enabled_DL",
    true
  );
  const complaintsEnabled = complaintsEnabledGlobal && complaintsEnabledDelhi;

  const [delhi] = await db
    .select()
    .from(states)
    .where(eq(states.code, "DL"))
    .limit(1);

  let publicComplaints:
    | {
        id: number;
        title: string;
        photo_url: string;
        location_text: string;
        status: string;
        severity: string;
        created_at: Date;
        politician_id: number | null;
      }[] = [];

  const rawPoliticianId =
    typeof params.politicianId === "string" ? params.politicianId : undefined;

  const parsedPoliticianId = rawPoliticianId ? Number(rawPoliticianId) : NaN;
  const politicianId =
    Number.isFinite(parsedPoliticianId) && parsedPoliticianId > 0
      ? parsedPoliticianId
      : undefined;

  if (delhi) {
    publicComplaints = await db
      .select({
        id: complaints.id,
        title: complaints.title,
        photo_url: complaints.photo_url,
        location_text: complaints.location_text,
        status: complaints.status,
        severity: complaints.severity,
        created_at: complaints.created_at,
        politician_id: complaints.politician_id,
        politician_name: politicians.name
      })
      .from(complaints)
      .leftJoin(politicians, eq(complaints.politician_id, politicians.id))
      .where(
        and(eq(complaints.state_id, delhi.id), eq(complaints.is_public, true))
      )
      .orderBy(desc(complaints.created_at))
      .limit(50);
  }

  let selectedPoliticianSummary:
    | {
        name: string;
        position: string;
        constituencyName: string | null;
      }
    | undefined;

  if (politicianId) {
    const [row] = await db
      .select({
        id: politicians.id,
        name: politicians.name,
        position: politicians.position,
        constituency_id: politicians.constituency_id
      })
      .from(politicians)
      .where(eq(politicians.id, politicianId))
      .limit(1);

    if (row) {
      let constituencyName: string | null = null;

      if (row.constituency_id) {
        const [constituencyRow] = await db
          .select({
            id: constituencies.id,
            name: constituencies.name
          })
          .from(constituencies)
          .where(eq(constituencies.id, row.constituency_id))
          .limit(1);

        if (constituencyRow) {
          constituencyName = constituencyRow.name;
        }
      }

      selectedPoliticianSummary = {
        name: row.name,
        position: row.position,
        constituencyName
      };
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold text-slate-50 sm:text-4xl">
            Complaints — Delhi (India-wide soon)
          </h1>
          <p className="text-sm text-slate-300">
            File civic complaints for Delhi that reach the right civic bodies. neta is wired for
            India-wide rollout, starting with Delhi.
          </p>
        </header>

        {!complaintsEnabled && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100">
            Complaints filing is currently unavailable for Delhi. Existing public complaints remain
            visible below.
          </div>
        )}

        <ComplaintClient
          politicianId={politicianId}
          politicianSummary={selectedPoliticianSummary}
          complaintsEnabled={complaintsEnabled}
        />
      </div>
    </main>
  );
}
