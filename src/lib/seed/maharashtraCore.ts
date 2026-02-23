import { db } from "@/db/client";
import {
  constituencies,
  politicians,
  states,
  type Constituency,
  type Politician,
  type State
} from "@/db/schema";
import { and, eq } from "drizzle-orm";

type MaharashtraConstituencySeed = {
  name: string;
  type: "vidhan_sabha" | "lok_sabha";
};

type MaharashtraPoliticianSeed = {
  name: string;
  party: string;
  position: "MLA" | "MP";
  constituencyName: string;
};

const MH_CONSTITUENCIES: MaharashtraConstituencySeed[] = [
  {
    name: "Worli",
    type: "vidhan_sabha"
  },
  {
    name: "Nagpur South-West",
    type: "vidhan_sabha"
  }
];

const MH_POLITICIANS: MaharashtraPoliticianSeed[] = [
  {
    name: "Example MLA, Worli",
    party: "Example Party",
    position: "MLA",
    constituencyName: "Worli"
  },
  {
    name: "Example MLA, Nagpur South-West",
    party: "Example Party",
    position: "MLA",
    constituencyName: "Nagpur South-West"
  }
];

async function ensureMaharashtraState(): Promise<State> {
  const existing = await db
    .select()
    .from(states)
    .where(eq(states.code, "MH"))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const inserted = await db
    .insert(states)
    .values({
      code: "MH",
      name: "Maharashtra",
      primary_city_label: "Mumbai",
      is_enabled: true,
      ingestion_status: "idle"
    })
    .returning();

  return inserted[0];
}

async function upsertMhConstituency(
  state: State,
  seed: MaharashtraConstituencySeed
): Promise<Constituency> {
  const existing = await db
    .select()
    .from(constituencies)
    .where(
      and(
        eq(constituencies.state_id, state.id),
        eq(constituencies.type, seed.type),
        eq(constituencies.name, seed.name)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const inserted = await db
    .insert(constituencies)
    .values({
      state_id: state.id,
      type: seed.type,
      name: seed.name
    })
    .returning();

  return inserted[0];
}

async function upsertMhPolitician(
  state: State,
  payload: MaharashtraPoliticianSeed,
  constituency: Constituency
): Promise<Politician> {
  const slugBase = `${payload.position}-${payload.name}-${constituency.name}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const existing = await db
    .select()
    .from(politicians)
    .where(
      and(
        eq(politicians.state_id, state.id),
        eq(politicians.position, payload.position),
        eq(politicians.name, payload.name),
        eq(politicians.constituency_id, constituency.id)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const inserted = await db
    .insert(politicians)
    .values({
      state_id: state.id,
      name: payload.name,
      slug: slugBase,
      position: payload.position,
      party: payload.party,
      constituency_id: constituency.id
    })
    .returning();

  return inserted[0];
}

export async function seedMaharashtraCore(): Promise<void> {
  const mh = await ensureMaharashtraState();

  const constituencyByName = new Map<string, Constituency>();

  for (const seed of MH_CONSTITUENCIES) {
    const constituency = await upsertMhConstituency(mh, seed);
    constituencyByName.set(seed.name, constituency);
  }

  for (const pol of MH_POLITICIANS) {
    const constituency = constituencyByName.get(pol.constituencyName);

    if (!constituency) {
      continue;
    }

    await upsertMhPolitician(mh, pol, constituency);
  }
}

