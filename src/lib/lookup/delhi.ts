import { db } from "@/db/client";
import {
  states,
  constituencies,
  politicians,
  type Politician
} from "@/db/schema";
import { and, asc, eq, ilike } from "drizzle-orm";

export type DelhiConstituencyInfo = {
  lokSabhaName: string | null;
  vidhanSabhaName: string | null;
};

/**
 * Uses official CEO Delhi / India.gov.in service to resolve
 * Assembly and Parliamentary constituency from a locality string.
 *
 * Reference services:
 * - https://services.india.gov.in/service/detail/know-your-assembly-and-parliamentary-constituency-in-delhi-1
 * - https://ceodelhi.gov.in/SearchLocality.aspx
 */
export async function resolveDelhiConstituenciesForLocality(
  locality: string
): Promise<DelhiConstituencyInfo> {
  if (!locality.trim()) {
    return { lokSabhaName: null, vidhanSabhaName: null };
  }

  // TODO: Implement real scraping / form POST to CEO Delhi "SearchLocality.aspx".
  // For now, we just return nulls so API remains real but non-functional
  // until ingestion and scraping are implemented.
  return { lokSabhaName: null, vidhanSabhaName: null };
}

export type DelhiRepsByConstituency = {
  constituencyName: string | null;
  mp: Politician | null;
  mla: Politician | null;
};

export async function getDelhiRepsByConstituencySearch(
  search: string
): Promise<DelhiRepsByConstituency> {
  const trimmed = search.trim();

  if (!trimmed) {
    return {
      constituencyName: null,
      mp: null,
      mla: null
    };
  }

  const [delhi] = await db
    .select()
    .from(states)
    .where(eq(states.code, "DL"))
    .limit(1);

  if (!delhi) {
    return {
      constituencyName: null,
      mp: null,
      mla: null
    };
  }

  const acRows = await db
    .select()
    .from(constituencies)
    .where(
      and(
        eq(constituencies.state_id, delhi.id),
        eq(constituencies.type, "vidhan_sabha"),
        ilike(constituencies.name, `%${trimmed}%`)
      )
    )
    .orderBy(asc(constituencies.name))
    .limit(1);

  const ac = acRows[0];

  if (!ac) {
    return {
      constituencyName: null,
      mp: null,
      mla: null
    };
  }

  const constituencyName = ac.name;

  const [mlaRow] = await db
    .select()
    .from(politicians)
    .where(
      and(
        eq(politicians.state_id, delhi.id),
        eq(politicians.position, "MLA"),
        eq(politicians.constituency_id, ac.id)
      )
    )
    .limit(1);

  const [mpRow] = await db
    .select()
    .from(politicians)
    .where(
      and(
        eq(politicians.state_id, delhi.id),
        eq(politicians.position, "MP")
      )
    )
    .orderBy(asc(politicians.id))
    .limit(1);

  return {
    constituencyName,
    mla: mlaRow ?? null,
    mp: mpRow ?? null
  };
}

export type DelhiRepsForLocality = {
  lokSabhaName: string | null;
  vidhanSabhaName: string | null;
  mp: Politician | null;
  mla: Politician | null;
};

export async function getDelhiRepsForLocality(
  locality: string
): Promise<DelhiRepsForLocality> {
  let { lokSabhaName, vidhanSabhaName } =
    await resolveDelhiConstituenciesForLocality(locality);

  let mp: Politician | null = null;
  let mla: Politician | null = null;

  if (!lokSabhaName && !vidhanSabhaName) {
    const trimmed = locality.trim();

    if (trimmed) {
      const [delhi] = await db
        .select()
        .from(states)
        .where(eq(states.code, "DL"))
        .limit(1);

      if (delhi) {
        const acRows = await db
          .select()
          .from(constituencies)
          .where(
            and(
              eq(constituencies.state_id, delhi.id),
              eq(constituencies.type, "vidhan_sabha"),
              ilike(constituencies.name, `%${trimmed}%`)
            )
          )
          .orderBy(asc(constituencies.name))
          .limit(1);

        const ac = acRows[0];

        if (ac) {
          vidhanSabhaName = ac.name;

          const [mlaRow] = await db
            .select()
            .from(politicians)
            .where(
              and(
                eq(politicians.state_id, delhi.id),
                eq(politicians.position, "MLA"),
                eq(politicians.constituency_id, ac.id)
              )
            )
            .limit(1);

          mla = mlaRow ?? null;

          const [mpRow] = await db
            .select()
            .from(politicians)
            .where(
              and(
                eq(politicians.state_id, delhi.id),
                eq(politicians.position, "MP")
              )
            )
            .limit(1);

          mp = mpRow ?? null;

          if (!lokSabhaName && mp && mp.constituency_id) {
            const [mpConst] = await db
              .select()
              .from(constituencies)
              .where(eq(constituencies.id, mp.constituency_id))
              .limit(1);

            lokSabhaName = mpConst?.name ?? lokSabhaName;
          }
        }
      }
    }
  }

  if (lokSabhaName) {
    const lokRows = await db
      .select()
      .from(constituencies)
      .where(eq(constituencies.name, lokSabhaName))
      .limit(1);

    const lok = lokRows[0];

    if (lok) {
      const [mpRow] = await db
        .select()
        .from(politicians)
        .where(eq(politicians.constituency_id, lok.id))
        .limit(1);

      mp = mpRow ?? null;
    }
  }

  if (vidhanSabhaName) {
    const vidRows = await db
      .select()
      .from(constituencies)
      .where(eq(constituencies.name, vidhanSabhaName))
      .limit(1);

    const vid = vidRows[0];

    if (vid) {
      const [mlaRow] = await db
        .select()
        .from(politicians)
        .where(eq(politicians.constituency_id, vid.id))
        .limit(1);

      mla = mlaRow ?? null;
    }
  }

  return { lokSabhaName, vidhanSabhaName, mp, mla };
}
