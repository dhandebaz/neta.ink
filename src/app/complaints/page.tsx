import type { Metadata } from "next";
import { ComplaintClient } from "./ComplaintClient";
import { db } from "@/db/client";
import { states } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { getStateAndGlobalFeatureFlagBoolean, getUserOrDefaultState } from "@/lib/states";
import { isAiComplaintsEnabled } from "@/lib/ai/flags";

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

  let complaintsEnabled = false;
  let aiComplaintsEnabled = true;
  let stateWarning: string | null = null;
  let stateDisplayName = "Delhi";
  let politicianId: number | undefined;
  let selectedPoliticianSummary:
    | {
        name: string;
        position: string;
        constituencyName: string | null;
      }
    | undefined;

  let dataError: string | null = null;

  try {
    const currentUser = await getCurrentUser();

    const stateCodeParam =
      typeof params.state === "string" ? params.state.toUpperCase() : undefined;
    let effectiveStateCode: string;

    if (stateCodeParam && stateCodeParam.length === 2) {
      effectiveStateCode = stateCodeParam;
    } else if (currentUser) {
      const userState = await getUserOrDefaultState({
        state_code: currentUser.state_code
      });
      effectiveStateCode = userState.code;
    } else {
      effectiveStateCode = "DL";
    }

    const [stateRow] = await db
      .select()
      .from(states)
      .where(eq(states.code, effectiveStateCode))
      .limit(1);

    if (stateRow) {
      stateDisplayName = stateRow.name;

      if (stateRow.is_enabled && stateRow.ingestion_status !== "ready") {
        stateWarning = `We\u2019re still setting up data for ${stateRow.name}. Some features may be limited.`;
      }
    } else {
      stateDisplayName = effectiveStateCode === "DL" ? "Delhi" : "this state";
    }

    complaintsEnabled = await getStateAndGlobalFeatureFlagBoolean(
      effectiveStateCode,
      "complaints_enabled",
      true
    );

    aiComplaintsEnabled = await isAiComplaintsEnabled();

    const rawPoliticianId =
      typeof params.politicianId === "string" ? params.politicianId : undefined;

    const parsedPoliticianId = rawPoliticianId ? Number(rawPoliticianId) : NaN;
    politicianId =
      Number.isFinite(parsedPoliticianId) && parsedPoliticianId > 0
        ? parsedPoliticianId
        : undefined;
  } catch (error) {
    console.error("Error loading complaints page data", error);
    dataError =
      "Complaints data is temporarily unavailable. Please try again in a bit.";
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-6">
        <header className="space-y-3">
          <h1 className="text-3xl font-semibold text-slate-50 sm:text-4xl">
            Complaints — {stateDisplayName} (India-wide soon)
          </h1>
          <p className="text-sm text-slate-300">
            File civic complaints for {stateDisplayName} that reach the right civic bodies. neta is
            wired for India-wide rollout, starting with Delhi.
          </p>
        </header>

        {dataError && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-100">
            {dataError}
          </div>
        )}

        {!dataError && stateWarning && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100">
            {stateWarning}
          </div>
        )}

        {!dataError && !complaintsEnabled && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100">
            Complaints filing is currently unavailable for {stateDisplayName}. Existing public
            complaints remain visible below.
          </div>
        )}

        <ComplaintClient
          politicianId={politicianId}
          politicianSummary={selectedPoliticianSummary}
          complaintsEnabled={complaintsEnabled && !dataError}
          aiComplaintsEnabled={aiComplaintsEnabled}
          stateDisplayName={stateDisplayName}
        />
      </div>
    </main>
  );
}
