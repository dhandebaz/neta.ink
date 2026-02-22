import { db } from "@/db/client";
import { constituencies, politicians, states } from "@/db/schema";
import { and, asc, eq, inArray } from "drizzle-orm";

export type DelhiRankingRow = {
  id: number;
  name: string;
  position: "MLA" | "MP";
  party: string | null;
  constituencyName: string | null;
  criminal_cases: number;
  assets_worth: bigint;
  votes_up: number;
  votes_down: number;
  score: number;
};

function computeScore(input: {
  criminal_cases: number;
  assets_worth: bigint;
  votes_up: number;
  votes_down: number;
}): number {
  const criminalCases = input.criminal_cases ?? 0;
  const votesUp = input.votes_up ?? 0;
  const votesDown = input.votes_down ?? 0;
  const base = 3;

  const casesPenalty = criminalCases * 0.5;

  const crores =
    Number(input.assets_worth ?? BigInt(0)) / 10_000_000 || 0;
  const assetsPenalty = crores * 0.05;

  const votesDelta = votesUp - votesDown;
  const votesBoost = votesDelta * 0.01;

  const raw = base - casesPenalty - assetsPenalty + votesBoost;

  if (raw < 0) return 0;
  if (raw > 5) return 5;
  return Number(raw.toFixed(2));
}

export async function getDelhiRankings(limit = 50): Promise<DelhiRankingRow[]> {
  try {
    const [delhi] = await db
      .select()
      .from(states)
      .where(eq(states.code, "DL"))
      .limit(1);

    if (!delhi) {
      return [];
    }

    const rows = await db
      .select({
        id: politicians.id,
        name: politicians.name,
        position: politicians.position,
        party: politicians.party,
        constituency_id: politicians.constituency_id,
        criminal_cases: politicians.criminal_cases,
        assets_worth: politicians.assets_worth,
        votes_up: politicians.votes_up,
        votes_down: politicians.votes_down
      })
      .from(politicians)
      .where(
        and(
          eq(politicians.state_id, delhi.id),
          inArray(politicians.position, ["MLA", "MP"])
        )
      )
      .orderBy(asc(politicians.id));

    if (!rows.length) {
      return [];
    }

    const constituencyIds = rows
      .map((r) => r.constituency_id)
      .filter((id): id is number => typeof id === "number");

    let constituencyMap = new Map<number, string>();

    if (constituencyIds.length > 0) {
      const constRows = await db
        .select({
          id: constituencies.id,
          name: constituencies.name
        })
        .from(constituencies)
        .where(inArray(constituencies.id, constituencyIds));

      constituencyMap = new Map(constRows.map((c) => [c.id, c.name]));
    }

    const scored: DelhiRankingRow[] = rows.map((row) => {
      const score = computeScore({
        criminal_cases: row.criminal_cases,
        assets_worth: row.assets_worth,
        votes_up: row.votes_up,
        votes_down: row.votes_down
      });

      const constituencyName =
        typeof row.constituency_id === "number"
          ? constituencyMap.get(row.constituency_id) ?? null
          : null;

      const position = (row.position as "MLA" | "MP") ?? "MLA";

      return {
        id: row.id,
        name: row.name,
        position,
        party: row.party,
        constituencyName,
        criminal_cases: row.criminal_cases,
        assets_worth: row.assets_worth,
        votes_up: row.votes_up,
        votes_down: row.votes_down,
        score
      };
    });

    scored.sort((a, b) => a.score - b.score);

    return scored.slice(0, limit);
  } catch (error) {
    console.error("Error loading Delhi rankings", error);
    return [];
  }
}
