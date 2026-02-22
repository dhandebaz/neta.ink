import type { Metadata } from "next";
import { db } from "@/db/client";
import { constituencies, politicians } from "@/db/schema";
import { eq } from "drizzle-orm";
import { RtiClient } from "./RtiClient";
import { getFeatureFlagBoolean } from "@/lib/states";

export const metadata: Metadata = {
  title: "neta RTI – draft RTI applications for India (Delhi first)",
  description:
    "Draft clear RTI applications that reference your representatives. Live for Delhi today, with India-wide support wired in.",
  openGraph: {
    type: "website",
    url: "https://neta.ink/rti",
    title: "neta RTI – draft RTI applications for India (Delhi first)",
    description:
      "Use neta to draft RTI applications under the RTI Act 2005, tuned for your representatives. Phase 1 is live in Delhi.",
    images: ["/og-default.jpg"]
  },
  alternates: {
    canonical: "https://neta.ink/rti"
  }
};

type PageProps = {
  searchParams?: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
};

export default async function RtiPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const rawTargetType =
    typeof params.targetType === "string" ? params.targetType.toUpperCase() : undefined;

  const allowedTargetTypes = ["MP", "MLA", "DEPT"] as const;
  const initialTargetType = allowedTargetTypes.includes(rawTargetType as any)
    ? (rawTargetType as "MP" | "MLA" | "DEPT")
    : "DEPT";

  let rtiEnabled = false;
  let politicianId: number | undefined;
  let initialSummary:
    | {
        id: number;
        name: string;
        position: string;
        constituencyName: string | null;
      }
    | undefined;

  let dataError: string | null = null;

  try {
    const rtiEnabledGlobal = await getFeatureFlagBoolean("rti_enabled_global", true);
    const rtiEnabledDelhi = await getFeatureFlagBoolean("rti_enabled_DL", true);
    rtiEnabled = rtiEnabledGlobal && rtiEnabledDelhi;

    const rawPoliticianId =
      typeof params.politicianId === "string" ? params.politicianId : undefined;

    const parsedPoliticianId = rawPoliticianId ? Number(rawPoliticianId) : NaN;
    politicianId =
      Number.isFinite(parsedPoliticianId) && parsedPoliticianId > 0
        ? parsedPoliticianId
        : undefined;

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

        initialSummary = {
          id: row.id,
          name: row.name,
          position: row.position,
          constituencyName
        };
      }
    }
  } catch (error) {
    console.error("Error loading RTI page data", error);
    dataError =
      "RTI drafting data is temporarily unavailable. Please try again in a bit.";
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-3xl space-y-6">
        <header className="space-y-3 text-center">
          <h1 className="text-3xl font-bold">RTI Drafting (Delhi)</h1>
          <p className="text-sm text-slate-600">
            We help you draft RTI applications for Delhi for ₹11 per RTI. You can review the draft, pay, and then file it yourself on the official RTI portal.
          </p>
        </header>

        {dataError && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-100">
            {dataError}
          </div>
        )}

        {!dataError && !rtiEnabled && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-900">
            RTI drafting is currently unavailable for Delhi. Existing RTI history, if any, remains visible below.
          </div>
        )}
        <RtiClient
          initialTargetType={
            initialSummary && (initialSummary.position === "MP" || initialSummary.position === "MLA")
              ? (initialSummary.position as "MP" | "MLA")
              : initialTargetType
          }
          initialTargetId={initialSummary?.id}
          initialPoliticianSummary={
            initialSummary
              ? {
                  id: initialSummary.id,
                  name: initialSummary.name,
                  position: initialSummary.position,
                  constituencyName: initialSummary.constituencyName
                }
              : undefined
          }
          rtiEnabled={rtiEnabled && !dataError}
        />
      </div>
    </main>
  );
}
