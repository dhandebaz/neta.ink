import { db } from "@/db/client";
import { constituencies, politicians } from "@/db/schema";
import { and, asc, inArray, eq } from "drizzle-orm";

export type RankingRow = {
  id: number;
  name: string;
  slug: string;
  position: "MLA" | "MP";
  party: string | null;
  photo_url: string | null;
  constituencyName: string | null;
  criminal_cases: number;
  assets_worth: bigint;
  votes_up: number;
  votes_down: number;
  rating: number;
  score: number;
};

function computeScore(input: {
  rating: number;
  criminal_cases: number;
  assets_worth: bigint;
}): number {
  const rating = Number.isFinite(input.rating) ? input.rating : 0;
  const criminalCases = input.criminal_cases ?? 0;

  const crores =
    Number(input.assets_worth ?? BigInt(0)) / 10_000_000 || 0;

  const raw =
    rating * 2 -
    criminalCases * 0.5 -
    crores * 0.01;

  return Number(raw.toFixed(2));
}

export async function getRankingsByState(stateId: number, limit = 50): Promise<RankingRow[]> {
  try {
    const rows = await db
      .select({
        id: politicians.id,
        name: politicians.name,
        slug: politicians.slug,
        position: politicians.position,
        party: politicians.party,
        photo_url: politicians.photo_url,
        constituency_id: politicians.constituency_id,
        criminal_cases: politicians.criminal_cases,
        assets_worth: politicians.assets_worth,
        votes_up: politicians.votes_up,
        votes_down: politicians.votes_down,
        rating: politicians.rating
      })
      .from(politicians)
      .where(
        and(
          eq(politicians.state_id, stateId),
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

    const scored: RankingRow[] = rows.map((row) => {
      const score = computeScore({
        rating: Number(row.rating ?? 0),
        criminal_cases: row.criminal_cases,
        assets_worth: row.assets_worth
      });

      const constituencyName =
        typeof row.constituency_id === "number"
          ? constituencyMap.get(row.constituency_id) ?? null
          : null;

      const position = (row.position as "MLA" | "MP") ?? "MLA";

      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        position,
        party: row.party,
        photo_url: row.photo_url,
        constituencyName,
        criminal_cases: row.criminal_cases,
        assets_worth: row.assets_worth,
        votes_up: row.votes_up,
        votes_down: row.votes_down,
        rating: Number(row.rating ?? 0),
        score
      };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, limit);
  } catch (error) {
    console.error("Error loading rankings by state", error);
    return [];
  }
}
