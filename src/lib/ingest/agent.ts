import { db } from "@/db/client";
import { constituencies, politicians, states } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { callHyperbrowserAgent } from "@/lib/ai/router";

type AgentMlaRow = {
  name: string;
  party: string;
  constituency: string;
  criminal_cases: number;
  assets_worth_in_rupees: number;
};

type AgentIngestionResult = {
  success: true;
  count: number;
};

function normalizeAgentNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed.replace(/[,₹]/g, ""));
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function slugifyPolitician(stateCode: string, row: AgentMlaRow): string {
  const base = `mla-${stateCode}-${row.name}-${row.constituency}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base;
}

export async function runAgenticPoliticianIngestion(
  stateCode: string
): Promise<AgentIngestionResult> {
  const normalizedCode = stateCode.toUpperCase().trim();

  const [state] =
    (await db
      .select()
      .from(states)
      .where(eq(states.code, normalizedCode))
      .limit(1)) ?? [];

  if (!state) {
    throw new Error("State not found");
  }

  const prompt =
    `You are a political data extraction agent. Browse reliable sources (like MyNeta or Wikipedia) to find the current sitting MLAs for the ${state.name} Legislative Assembly. ` +
    "Return a STRICT JSON array of objects with the following keys: " +
    "'name' (string), 'party' (string), 'constituency' (string), 'criminal_cases' (integer), 'assets_worth_in_rupees' (number). " +
    "Extract at least 20 MLAs to start. Do not include markdown fences in your response.";

  const result = await callHyperbrowserAgent(prompt);
  let text = result.text.trim();

  if (text.startsWith("```")) {
    const firstNewline = text.indexOf("\n");
    if (firstNewline !== -1) {
      text = text.slice(firstNewline + 1);
    }
    const lastFence = text.lastIndexOf("```");
    if (lastFence !== -1) {
      text = text.slice(0, lastFence);
    }
    text = text.trim();
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch (error) {
    console.error("Failed to parse Hyperbrowser MLA ingestion JSON", { text, error });
    throw new Error("AI response invalid");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("AI response must be an array");
  }

  const rows: AgentMlaRow[] = [];

  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const anyItem = item as any;
    const name =
      typeof anyItem.name === "string" ? anyItem.name.trim() : "";
    const party =
      typeof anyItem.party === "string" ? anyItem.party.trim() : "";
    const constituency =
      typeof anyItem.constituency === "string" ? anyItem.constituency.trim() : "";
    const casesNumber = normalizeAgentNumber(anyItem.criminal_cases);
    const assetsNumber = normalizeAgentNumber(anyItem.assets_worth_in_rupees);

    if (!name || !constituency || casesNumber === null || assetsNumber === null) {
      continue;
    }

    rows.push({
      name,
      party,
      constituency,
      criminal_cases: Math.max(0, Math.round(casesNumber)),
      assets_worth_in_rupees: assetsNumber
    });
  }

  if (rows.length === 0) {
    throw new Error("AI response did not contain any valid MLA rows");
  }

  let processedCount = 0;

  for (const row of rows) {
    const [existingConstituency] =
      (await db
        .select()
        .from(constituencies)
        .where(
          and(
            eq(constituencies.state_id, state.id),
            eq(constituencies.name, row.constituency)
          )
        )
        .limit(1)) ?? [];

    let constituencyId: number;

    if (existingConstituency) {
      constituencyId = existingConstituency.id;
    } else {
      const insertedConstituency = await db
        .insert(constituencies)
        .values({
          state_id: state.id,
          type: "vidhan_sabha",
          name: row.constituency
        })
        .returning({ id: constituencies.id });
      constituencyId = insertedConstituency[0].id;
    }

    const [existingPolitician] =
      (await db
        .select()
        .from(politicians)
        .where(
          and(
            eq(politicians.state_id, state.id),
            eq(politicians.name, row.name)
          )
        )
        .limit(1)) ?? [];

    if (!existingPolitician) {
      const slug = slugifyPolitician(normalizedCode, row);

      await db.insert(politicians).values({
        state_id: state.id,
        name: row.name,
        slug,
        position: "MLA",
        party: row.party || null,
        constituency_id: constituencyId,
        criminal_cases: row.criminal_cases,
        assets_worth: BigInt(Math.round(row.assets_worth_in_rupees)),
        liabilities: BigInt(0)
      });
    }

    processedCount += 1;
  }

  return {
    success: true,
    count: processedCount
  };
}

