import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { states, politicians, constituencies } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import * as cheerio from "cheerio";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

// Deterministic map for state URLs
const STATE_URL_MAP: Record<string, string> = {
  DL: "https://myneta.info/Delhi2020/",
  MH: "https://myneta.info/Maharashtra2019/",
  UP: "https://myneta.info/UttarPradesh2022/",
  KA: "https://myneta.info/Karnataka2023/",
  TN: "https://myneta.info/TamilNadu2021/",
  WB: "https://myneta.info/WestBengal2021/",
  GJ: "https://myneta.info/Gujarat2022/",
  RJ: "https://myneta.info/Rajasthan2023/",
  MP: "https://myneta.info/MadhyaPradesh2023/",
  PB: "https://myneta.info/Punjab2022/",
  AP: "https://myneta.info/AndhraPradesh2024/",
  TL: "https://myneta.info/Telangana2023/",
};

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();

  if (!user || !user.is_system_admin) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { stateCode } = body;

  if (!stateCode) {
    return NextResponse.json(
      { success: false, error: "Missing stateCode" },
      { status: 400 }
    );
  }

  const [state] = await db
    .select()
    .from(states)
    .where(eq(states.code, stateCode))
    .limit(1);

  if (!state) {
    return NextResponse.json(
      { success: false, error: "State not found" },
      { status: 404 }
    );
  }

  // Update status to running
  await db
    .update(states)
    .set({ ingestion_status: "ingesting" })
    .where(eq(states.id, state.id));

  try {
    let targetUrl = STATE_URL_MAP[stateCode];

    // If not hardcoded, dynamically find the MyNeta URL using a fast DDG HTML search
    if (!targetUrl) {
      console.log(`No hardcoded URL for ${stateCode}, searching dynamically...`);
      const searchQuery = `site:myneta.info "Winning Candidates" ${state.name} Assembly Election`;
      const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;

      const ddgRes = await fetch(ddgUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });
      const ddgHtml = await ddgRes.text();

      const linkMatch =
        ddgHtml.match(/href="([^"]*myneta\.info[^"]*winner_analyzed[^"]*)"/i) ||
        ddgHtml.match(/href="([^"]*myneta\.info[^"]*)"/i);

      if (linkMatch && linkMatch[1]) {
        let rawLink = linkMatch[1];
        if (rawLink.includes("uddg=")) {
          rawLink = decodeURIComponent(rawLink.split("uddg=")[1].split("&")[0]);
        }
        targetUrl = rawLink;
      } else {
        throw new Error(`Could not dynamically locate MyNeta URL for state: ${state.name}`);
      }
    }

    console.log(`🎯 Target Locked: Fetching MyNeta -> ${targetUrl}`);
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

    // STRICT FIX: Find the correct table more robustly
    const targetTable = $('table').filter((i, el) => {
      const text = $(el).text();
      return text.includes('Candidate') && text.includes('Total Assets');
    }).first();

    if (targetTable.length === 0) {
      throw new Error("Could not find candidate table in MyNeta page");
    }

    const normalizeText = (value: string) => value.replace(/\s+/g, " ").trim();

    const parseRupeesNumber = (value: string) => {
      const cleaned = value.split("~")[0].replace(/[^\d]/g, "");
      if (!cleaned) return BigInt(0);
      const parsed = Number.parseInt(cleaned, 10);
      if (!Number.isFinite(parsed)) return BigInt(0);
      return BigInt(Math.max(0, parsed));
    };

    const safeParseInt = (value: string) => {
      const parsed = Number.parseInt(value.replace(/[^\d-]/g, ""), 10);
      if (!Number.isFinite(parsed)) return 0;
      return Math.max(0, parsed);
    };

    const toAbsoluteUrl = (base: string, href: string) => {
      try {
        return new URL(href, base).toString();
      } catch {
        return href;
      }
    };

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

    const extractedData: Array<{
      name: string;
      constituencyName: string;
      constituencySerial: string | null;
      party: string;
      criminalCases: number;
      assetsWorth: bigint;
      photoUrl: string;
      mynetaUrl: string | null;
    }> = [];

    const rows = targetTable.find("tr").slice(1).toArray();

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

      const candidateHref = candidateCell.find("a").attr("href");
      const mynetaUrl = candidateHref ? toAbsoluteUrl(targetUrl, candidateHref) : null;

      const constituencyRaw = normalizeText(constituencyCell.text());
      let constituencyName = constituencyRaw;
      let constituencySerial: string | null = null;
      const snMatch = constituencyRaw.match(/^(\d+)\s*[-.]\s*(.+)$/);
      if (snMatch) {
        constituencySerial = snMatch[1];
        constituencyName = normalizeText(snMatch[2]);
      }

      const party = normalizeText(partyCell.text());
      const criminalCases = criminalCell ? safeParseInt(criminalCell.text()) : 0;
      const assetsWorth = parseRupeesNumber(assetsCell.text());

      const imgSrc = $(row).find("img").first().attr("src");
      const photoUrl = imgSrc
        ? toAbsoluteUrl(targetUrl, imgSrc)
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=256`;

      if (!name || !constituencyName || !party) continue;

      extractedData.push({
        name,
        constituencyName,
        constituencySerial,
        party,
        criminalCases,
        assetsWorth,
        photoUrl,
        mynetaUrl
      });
    }

    if (extractedData.length === 0) {
      throw new Error("No politicians extracted from table");
    }

    await db
      .delete(politicians)
      .where(and(eq(politicians.state_id, state.id), eq(politicians.position, "MLA")));

    // Process extracted data
    for (const data of extractedData) {
      // 1. Upsert Constituency
      let constituencyId: number | null = null;
      
      // Try to find existing constituency
      // We normalize name to title case or keep as is? MyNeta is usually Title Case.
      const existingConstituency = await db
        .select()
        .from(constituencies)
        .where(
          and(
            eq(constituencies.state_id, state.id),
            eq(constituencies.type, "vidhan_sabha"),
            eq(constituencies.name, data.constituencyName)
          )
        )
        .limit(1);

      if (existingConstituency.length > 0) {
        constituencyId = existingConstituency[0].id;
      } else {
        // Create new
        const [inserted] = await db
          .insert(constituencies)
          .values({
            state_id: state.id,
            name: data.constituencyName,
            type: "vidhan_sabha",
            external_code: data.constituencySerial,
            district: null,
          })
          .returning({ id: constituencies.id });
        constituencyId = inserted.id;
      }

      // 2. Upsert Politician
      // Generate slug
      const slug = `mla-${stateCode.toLowerCase()}-${data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")}-${data.constituencyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")}`.replace(/-+/g, "-").replace(/^-|-$/g, "");

      const politicianData = {
        state_id: state.id,
        name: data.name,
        party: data.party,
        constituency_id: constituencyId,
        position: "MLA",
        slug: slug,
        criminal_cases: data.criminalCases,
        assets_worth: data.assetsWorth,
        photo_url: data.photoUrl,
        myneta_url: data.mynetaUrl,
        updated_at: new Date(),
      };

      // Check for existing politician by slug
      const existingPol = await db
        .select({ id: politicians.id })
        .from(politicians)
        .where(eq(politicians.slug, slug))
        .limit(1);

      if (existingPol.length > 0) {
        await db
          .update(politicians)
          .set(politicianData)
          .where(eq(politicians.id, existingPol[0].id));
      } else {
        // Handle potential slug collision on insert if unique constraint fails
        try {
          await db.insert(politicians).values(politicianData);
        } catch (e) {
          console.error(`Failed to insert politician ${slug}:`, e);
          // Try with random suffix if it's a slug collision
          // For now, skip
        }
      }
    }

    await db
      .update(states)
      .set({ ingestion_status: "ready" })
      .where(eq(states.id, state.id));

    return NextResponse.json({ success: true, count: extractedData.length });

  } catch (error: any) {
    console.error("Ingestion failed:", error);
    
    await db
      .update(states)
      .set({ ingestion_status: "error" })
      .where(eq(states.id, state.id));

    return NextResponse.json(
      { success: false, error: error.message || "Ingestion failed" },
      { status: 500 }
    );
  }
}
