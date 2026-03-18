import { db } from "@/db/client";
import { constituencies, politicians, states } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { ensureDelhiState } from "@/lib/states";
import * as cheerio from "cheerio";

const DELHI_LOK_SABHA_CONSTITUENCIES: Array<{ name: string; mynetaConstituencyId: number }> = [
  { name: "Chandni Chowk", mynetaConstituencyId: 103 },
  { name: "North East Delhi", mynetaConstituencyId: 104 },
  { name: "East Delhi", mynetaConstituencyId: 105 },
  { name: "New Delhi", mynetaConstituencyId: 106 },
  { name: "North West Delhi", mynetaConstituencyId: 107 },
  { name: "West Delhi", mynetaConstituencyId: 108 },
  { name: "South Delhi", mynetaConstituencyId: 109 }
];

const DELHI_LOK_SABHA_MAP: Record<string, string[]> = {
  "Chandni Chowk": ["Chandni Chowk", "Matia Mahal", "Ballimaran", "Karol Bagh", "Sadar Bazaar"],
  "North East Delhi": [
    "Seelampur",
    "Gokalpur",
    "Karawal Nagar",
    "Mustafabad",
    "Babarpur",
    "Yamuna Vihar"
  ],
  "East Delhi": [
    "Laxmi Nagar",
    "Geeta Colony",
    "Krishna Nagar",
    "Gandhi Nagar",
    "Shahdara",
    "Jhilmil",
    "Vishnu Garden",
    "Trilokpuri",
    "Kondli"
  ],
  "New Delhi": [
    "New Delhi",
    "Sadar Bazaar",
    "Patel Nagar",
    "Moti Nagar",
    "Rajouri Garden",
    "Kasturba Nagar",
    "Defence Colony",
    "Lajpat Nagar",
    "Jangpura"
  ],
  "North West Delhi": [
    "Model Town",
    "Adarsh Nagar",
    "Shakur Basti",
    "Kamla Nagar",
    "Burari",
    "Bawana",
    "Narela",
    "Nangloi Jat",
    "Sultanpur Majra",
    "Mangol Puri"
  ],
  "West Delhi": [
    "Madipur",
    "Tilak Nagar",
    "Janakpuri",
    "Vikaspuri",
    "Uttam Nagar",
    "Matiala",
    "Najafgarh",
    "Dwarka",
    "Palam",
    "Delhi Cantt"
  ],
  "South Delhi": [
    "Mehrauli",
    "Malviya Nagar",
    "Hauz Khas",
    "Safdarjung Enclave",
    "Greater Kailash",
    "Kalkaji",
    "Okhla",
    "Sangam Vihar",
    "Ambedkar Nagar",
    "Deoli",
    "Pul Prahladpur",
    "Tughlakabad",
    "Badarpur"
  ]
};

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function parseRupeesNumber(value: string): bigint {
  const cleaned = value.replace(/[^\d]/g, "");
  if (!cleaned) return BigInt(0);
  const parsed = Number.parseInt(cleaned, 10);
  if (!Number.isFinite(parsed)) return BigInt(0);
  return BigInt(Math.max(0, parsed));
}

function safeParseInt(value: string): number {
  const parsed = Number.parseInt(value.replace(/[^\d-]/g, ""), 10);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, parsed);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function toAbsoluteUrl(baseUrl: string, url: string): string {
  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return url;
  }
}

async function ingestDelhiMLAsFromMyNeta(): Promise<number> {
  const delhi = await ensureDelhiState();

  const targetUrl =
    "https://www.myneta.info/Delhi2025/index.php?action=summary&subAction=winner_analyzed&sort=candidate#summary";

  const response = await fetch(targetUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch MyNeta URL: ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const targetTable = $("table")
    .filter((_, el) => {
      const text = $(el).text();
      return text.includes("Candidate") && text.includes("Total Assets");
    })
    .first();

  if (targetTable.length === 0) {
    throw new Error("Could not find candidate table in MyNeta page");
  }

  const headerCells = targetTable.find("tr").first().find("th, td").toArray();
  const headers = headerCells.map((cell) => normalizeText($(cell).text()));

  const candidateIdx = headers.findIndex((h) => /candidate/i.test(h));
  const constituencyIdx = headers.findIndex((h) => /constituency/i.test(h));
  const partyIdx = headers.findIndex((h) => /^party$/i.test(h) || /party/i.test(h));
  const criminalIdx = headers.findIndex((h) => /criminal/i.test(h));
  const assetsIdx = headers.findIndex((h) => /total assets/i.test(h));

  if ([candidateIdx, constituencyIdx, partyIdx, assetsIdx].some((idx) => idx < 0)) {
    throw new Error("Unexpected MyNeta table format");
  }

  await db
    .delete(politicians)
    .where(and(eq(politicians.state_id, delhi.id), eq(politicians.position, "MLA")));

  const rows = targetTable.find("tr").slice(1).toArray();
  const ingested: Array<{
    name: string;
    party: string;
    constituencyName: string;
    constituencySerial: string | null;
    mynetaUrl: string | null;
    criminalCases: number;
    assetsWorth: bigint;
    photoUrl: string | null;
  }> = [];

  for (const row of rows) {
    const cells = $(row).find("td").toArray();
    if (cells.length === 0) continue;

    const candidateCell = cells[candidateIdx] ? $(cells[candidateIdx]) : null;
    const constituencyCell = cells[constituencyIdx] ? $(cells[constituencyIdx]) : null;
    const partyCell = cells[partyIdx] ? $(cells[partyIdx]) : null;
    const criminalCell = criminalIdx >= 0 && cells[criminalIdx] ? $(cells[criminalIdx]) : null;
    const assetsCell = cells[assetsIdx] ? $(cells[assetsIdx]) : null;

    if (!candidateCell || !constituencyCell || !partyCell || !assetsCell) continue;

    let name = normalizeText(candidateCell.text());
    name = name.replace(/\(Winner\)/gi, "").trim();
    if (!name) continue;

    const mynetaHref = candidateCell.find("a").attr("href");
    const mynetaUrl = mynetaHref ? toAbsoluteUrl(targetUrl, mynetaHref) : null;

    const constituencyRaw = normalizeText(constituencyCell.text());
    let constituencyName = constituencyRaw;
    let constituencySerial: string | null = null;
    const snMatch = constituencyRaw.match(/^(\d+)\s*[-.]\s*(.+)$/);
    if (snMatch) {
      constituencySerial = snMatch[1];
      constituencyName = normalizeText(snMatch[2]);
    }

    const party = normalizeText(partyCell.text());
    if (!party || !constituencyName) continue;

    const criminalCases = criminalCell ? safeParseInt(criminalCell.text()) : 0;
    const assetsWorth = parseRupeesNumber(assetsCell.text());

    const imgSrc = $(row).find("img").first().attr("src");
    const photoUrl = imgSrc ? toAbsoluteUrl(targetUrl, imgSrc) : null;

    ingested.push({
      name,
      party,
      constituencyName,
      constituencySerial,
      mynetaUrl,
      criminalCases,
      assetsWorth,
      photoUrl
    });
  }

  if (ingested.length === 0) {
    throw new Error("No politicians extracted from table");
  }

  const constituencyNameSet = Array.from(
    new Set(ingested.map((row) => row.constituencyName))
  );

  const existingConstituencyRows =
    (await db
      .select({
        id: constituencies.id,
        name: constituencies.name,
        external_code: constituencies.external_code
      })
      .from(constituencies)
      .where(
        and(
          eq(constituencies.state_id, delhi.id),
          eq(constituencies.type, "vidhan_sabha"),
          inArray(constituencies.name, constituencyNameSet)
        )
      )) ?? [];

  const constituencyIdByName = new Map<string, number>();
  for (const row of existingConstituencyRows) {
    constituencyIdByName.set(row.name, row.id);
  }

  for (const row of ingested) {
    if (constituencyIdByName.has(row.constituencyName)) continue;

    const [inserted] = await db
      .insert(constituencies)
      .values({
        state_id: delhi.id,
        type: "vidhan_sabha",
        name: row.constituencyName,
        external_code: row.constituencySerial
      })
      .returning({ id: constituencies.id });

    constituencyIdByName.set(row.constituencyName, inserted.id);
  }

  for (const row of ingested) {
    const constituencyId = constituencyIdByName.get(row.constituencyName);
    if (!constituencyId) continue;

    const slug = slugify(`mla-dl-${row.name}-${row.constituencyName}`);

    const [existing] =
      (await db
        .select({ id: politicians.id })
        .from(politicians)
        .where(eq(politicians.slug, slug))
        .limit(1)) ?? [];

    const photoUrl =
      row.photoUrl ??
      `https://ui-avatars.com/api/?name=${encodeURIComponent(row.name)}&background=random&color=fff&size=256`;

    const payload = {
      state_id: delhi.id,
      name: row.name,
      slug,
      position: "MLA",
      party: row.party,
      constituency_id: constituencyId,
      myneta_url: row.mynetaUrl,
      photo_url: photoUrl,
      criminal_cases: row.criminalCases,
      assets_worth: row.assetsWorth,
      updated_at: new Date()
    };

    if (existing) {
      await db.update(politicians).set(payload).where(eq(politicians.id, existing.id));
    } else {
      await db.insert(politicians).values(payload);
    }
  }

  return ingested.length;
}

async function ingestDelhiMPsFromMyNeta(): Promise<number> {
  const delhi = await ensureDelhiState();

  await db
    .delete(politicians)
    .where(and(eq(politicians.state_id, delhi.id), eq(politicians.position, "MP")));

  const targetBaseUrl = "https://www.myneta.info/LokSabha2024/";

  let insertedCount = 0;

  for (const entry of DELHI_LOK_SABHA_CONSTITUENCIES) {
    const pageUrl = `${targetBaseUrl}index.php?action=show_candidates&constituency_id=${entry.mynetaConstituencyId}`;
    const response = await fetch(pageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch MyNeta LokSabha page: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const targetTable = $("table")
      .filter((_, el) => {
        const text = $(el).text();
        return text.includes("Candidate") && text.includes("Total Assets");
      })
      .first();

    if (targetTable.length === 0) {
      throw new Error(`Could not find Lok Sabha candidates table for ${entry.name}`);
    }

    const headerCells = targetTable.find("tr").first().find("th, td").toArray();
    const headers = headerCells.map((cell) => normalizeText($(cell).text()));

    const candidateIdx = headers.findIndex((h) => /candidate/i.test(h));
    const partyIdx = headers.findIndex((h) => /^party$/i.test(h) || /party/i.test(h));
    const criminalIdx = headers.findIndex((h) => /criminal/i.test(h));
    const assetsIdx = headers.findIndex((h) => /total assets/i.test(h));

    if ([candidateIdx, partyIdx, assetsIdx].some((idx) => idx < 0)) {
      throw new Error(`Unexpected Lok Sabha table format for ${entry.name}`);
    }

    const rows = targetTable.find("tr").slice(1).toArray();

    let winner: {
      name: string;
      party: string;
      criminalCases: number;
      assetsWorth: bigint;
      mynetaUrl: string | null;
    } | null = null;

    for (const row of rows) {
      const cells = $(row).find("td").toArray();
      if (cells.length === 0) continue;

      const candidateCell = cells[candidateIdx] ? $(cells[candidateIdx]) : null;
      const partyCell = cells[partyIdx] ? $(cells[partyIdx]) : null;
      const assetsCell = cells[assetsIdx] ? $(cells[assetsIdx]) : null;
      const criminalCell = criminalIdx >= 0 && cells[criminalIdx] ? $(cells[criminalIdx]) : null;

      if (!candidateCell || !partyCell || !assetsCell) continue;

      const candidateText = normalizeText(candidateCell.text());
      if (!/winner/i.test(candidateText)) continue;

      const name = candidateText.replace(/\bwinner\b/gi, "").replace(/\s+/g, " ").trim();
      const party = normalizeText(partyCell.text());
      const criminalCases = criminalCell ? safeParseInt(criminalCell.text()) : 0;
      const assetsWorth = parseRupeesNumber(assetsCell.text());
      const href = candidateCell.find("a").attr("href");
      const mynetaUrl = href ? toAbsoluteUrl(pageUrl, href) : null;

      if (!name || !party) continue;

      winner = { name, party, criminalCases, assetsWorth, mynetaUrl };
      break;
    }

    if (!winner) {
      throw new Error(`Could not find MP winner row for ${entry.name}`);
    }

    const [existingLs] =
      (await db
        .select({ id: constituencies.id })
        .from(constituencies)
        .where(
          and(
            eq(constituencies.state_id, delhi.id),
            eq(constituencies.type, "lok_sabha"),
            eq(constituencies.name, entry.name)
          )
        )
        .limit(1)) ?? [];

    const lsId =
      existingLs?.id ??
      (
        await db
          .insert(constituencies)
          .values({
            state_id: delhi.id,
            type: "lok_sabha",
            name: entry.name
          })
          .returning({ id: constituencies.id })
      )[0].id;

    const slug = slugify(`mp-dl-${winner.name}-${entry.name}`);
    const photoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(winner.name)}&background=random&color=fff&size=256`;

    await db.insert(politicians).values({
      state_id: delhi.id,
      name: winner.name,
      slug,
      position: "MP",
      party: winner.party,
      constituency_id: lsId,
      myneta_url: winner.mynetaUrl,
      photo_url: photoUrl,
      criminal_cases: winner.criminalCases,
      assets_worth: winner.assetsWorth,
      liabilities: BigInt(0),
      updated_at: new Date()
    });

    insertedCount += 1;
  }

  for (const [lokSabhaName, assemblies] of Object.entries(DELHI_LOK_SABHA_MAP)) {
    const [ls] =
      (await db
        .select({ id: constituencies.id })
        .from(constituencies)
        .where(
          and(
            eq(constituencies.state_id, delhi.id),
            eq(constituencies.type, "lok_sabha"),
            eq(constituencies.name, lokSabhaName)
          )
        )
        .limit(1)) ?? [];

    if (!ls) continue;

    await db
      .update(constituencies)
      .set({ parent_id: ls.id })
      .where(
        and(
          eq(constituencies.state_id, delhi.id),
          eq(constituencies.type, "vidhan_sabha"),
          inArray(constituencies.name, assemblies)
        )
      );
  }

  return insertedCount;
}

export async function runDelhiIngestion(): Promise<void> {
  const delhi = await ensureDelhiState();

  if (delhi.ingestion_status === "ingesting") {
    return;
  }

  await db
    .update(states)
    .set({ ingestion_status: "ingesting" })
    .where(eq(states.id, delhi.id));

  try {
    await ingestDelhiMLAsFromMyNeta();
    await ingestDelhiMPsFromMyNeta();

    await db
      .update(states)
      .set({ ingestion_status: "ready" })
      .where(eq(states.id, delhi.id));
  } catch (error) {
    console.error("Delhi ingestion failed", error);
    await db
      .update(states)
      .set({ ingestion_status: "error" })
      .where(eq(states.id, delhi.id));
  }
}
