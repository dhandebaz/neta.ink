import { db } from "@/db/client";
import {
  states,
  constituencies,
  politicians,
  type State,
  type Constituency,
  type Politician
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { ensureDelhiState } from "@/lib/states";

type DelhiAssemblyConstituencySeed = {
  name: string;
};

type DelhiMLASeed = {
  name: string;
  party: string;
  constituencyName: string;
  mynetaUrl: string;
  criminalCases: number;
  assetsWorth: bigint;
};

type DelhiMPSeed = {
  name: string;
  party: string;
  lokSabhaName: string;
  mynetaUrl: string;
};

export const DELHI_ASSEMBLY_CONSTITUENCIES: DelhiAssemblyConstituencySeed[] = [
  // TODO: Fill with all 70 Delhi Assembly constituency names from:
  // - https://www.ceodelhi.gov.in/AcListEng.aspx
  // - https://www.myneta.info/state_assembly.php?state=Delhi
];

export const DELHI_MLAS: DelhiMLASeed[] = [
  // TODO: Fill with Delhi MLA winners (name, party, constituencyName, urls, cases, assets) from:
  // - https://www.myneta.info/Delhi2025/
  // - https://www.myneta.info/state_assembly.php?state=Delhi
];

export const DELHI_MPS: DelhiMPSeed[] = [
  // TODO: Fill with 7 Delhi MPs (name, party, lokSabhaName, urls) from:
  // - https://www.ceodelhi.gov.in/KnowYourMP-MLA.aspx
  // - https://www.myneta.info
];

async function upsertConstituency(
  state: State,
  payload: DelhiAssemblyConstituencySeed,
  typeValue: "vidhan_sabha" | "lok_sabha"
): Promise<Constituency> {
  const existing = await db
    .select()
    .from(constituencies)
    .where(
      and(
        eq(constituencies.state_id, state.id),
        eq(constituencies.type, typeValue),
        eq(constituencies.name, payload.name)
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
      type: typeValue,
      name: payload.name
    })
    .returning();

  return inserted[0];
}

async function upsertPolitician(
  state: State,
  attrs: {
    name: string;
    position: "MLA" | "MP";
    party: string;
    constituencyId: number;
    mynetaUrl: string;
    criminalCases?: number;
    assetsWorth?: bigint;
  }
): Promise<Politician> {
  const existing = await db
    .select()
    .from(politicians)
    .where(
      and(
        eq(politicians.state_id, state.id),
        eq(politicians.position, attrs.position),
        eq(politicians.name, attrs.name),
        eq(politicians.constituency_id, attrs.constituencyId)
      )
    )
    .limit(1);

  const criminalCases = attrs.criminalCases ?? 0;
  const assetsWorth = attrs.assetsWorth ?? BigInt(0);

  if (existing.length > 0) {
    const updated = await db
      .update(politicians)
      .set({
        party: attrs.party,
        myneta_url: attrs.mynetaUrl,
        criminal_cases: criminalCases,
        assets_worth: assetsWorth
      })
      .where(eq(politicians.id, existing[0].id))
      .returning();

    return updated[0];
  }

  const inserted = await db
    .insert(politicians)
    .values({
      state_id: state.id,
      name: attrs.name,
      slug: attrs.name.toLowerCase().replace(/\s+/g, "-"),
      position: attrs.position,
      party: attrs.party,
      constituency_id: attrs.constituencyId,
      myneta_url: attrs.mynetaUrl,
      criminal_cases: criminalCases,
      assets_worth: assetsWorth
    })
    .returning();

  return inserted[0];
}

export async function seedDelhiCore(): Promise<void> {
  const delhi = await ensureDelhiState();

  for (const ac of DELHI_ASSEMBLY_CONSTITUENCIES) {
    await upsertConstituency(delhi, ac, "vidhan_sabha");
  }

  for (const mla of DELHI_MLAS) {
    const constituenciesRows = await db
      .select()
      .from(constituencies)
      .where(
        and(
          eq(constituencies.state_id, delhi.id),
          eq(constituencies.type, "vidhan_sabha"),
          eq(constituencies.name, mla.constituencyName)
        )
      )
      .limit(1);

    const constituency = constituenciesRows[0];

    if (!constituency) {
      console.warn(
        "Skipping MLA because constituency not found",
        mla.name,
        mla.constituencyName
      );
      continue;
    }

    await upsertPolitician(delhi, {
      name: mla.name,
      position: "MLA",
      party: mla.party,
      constituencyId: constituency.id,
      mynetaUrl: mla.mynetaUrl,
      criminalCases: mla.criminalCases,
      assetsWorth: mla.assetsWorth
    });
  }

  for (const mp of DELHI_MPS) {
    const lokSabhaConstituency = await upsertConstituency(
      delhi,
      { name: mp.lokSabhaName },
      "lok_sabha"
    );

    await upsertPolitician(delhi, {
      name: mp.name,
      position: "MP",
      party: mp.party,
      constituencyId: lokSabhaConstituency.id,
      mynetaUrl: mp.mynetaUrl
    });
  }
}

