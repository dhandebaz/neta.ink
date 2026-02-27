import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { states, politicians, constituencies } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
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
    const targetUrl = STATE_URL_MAP[stateCode];
    if (!targetUrl) {
      throw new Error(`No MyNeta URL configured for state code: ${stateCode}`);
    }

    console.log(`Fetching ${targetUrl} for state ${stateCode}`);
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

    let targetTable: cheerio.Cheerio<any> | null = null;
    $("table").each((_, table) => {
      const headerText = $(table).text().toLowerCase();
      if (
        headerText.includes("candidate") &&
        headerText.includes("party") &&
        headerText.includes("constituency")
      ) {
        targetTable = $(table);
        return false; // Break
      }
    });

    if (!targetTable) {
      throw new Error("Could not find candidate table in MyNeta page");
    }

    const extractedData: any[] = [];
    const rows = $(targetTable).find("tr");

    rows.each((index, row) => {
      if (index === 0) return;

      const cells = $(row).find("td");
      if (cells.length < 4) return;

      const nameCell = $(cells[1]);
      const constituencyCell = $(cells[2]);
      const partyCell = $(cells[3]);
      const criminalCell = $(cells[4]);
      const assetsCell = $(cells[6]);

      let name = nameCell.text().trim();
      name = name.replace(/\(Winner\)/i, "").trim();

      let constituencyRaw = constituencyCell.text().trim();
      // Extract Serial Number if present (e.g., "1 - Narela") or handle generic format
      let constituency = constituencyRaw;
      let serialNumber = "";
      
      // Attempt to extract serial number from start of string
      const snMatch = constituencyRaw.match(/^(\d+)\s*[-.]\s*(.+)/);
      if (snMatch) {
        serialNumber = snMatch[1];
        constituency = snMatch[2].trim();
      }
      
      // Format as "ConstituencyName (Sl. No. X)" if serial number found
      if (serialNumber) {
        constituency = `${constituency} (Sl. No. ${serialNumber})`;
      }

      const party = partyCell.text().trim();
      
      const criminalText = criminalCell.text().trim();
      const criminalCases = parseInt(criminalText) || 0;

      const assetsText = assetsCell.text().trim();
      let assets = 0;
      const cleanAssets = assetsText.split("~")[0].replace(/[^\d]/g, "");
      if (cleanAssets) {
        assets = parseInt(cleanAssets);
      }

      let photoUrl = "";
      const img = $(row).find("img");
      if (img.length > 0) {
        const src = img.attr("src");
        if (src) {
           if (src.startsWith("http")) {
             photoUrl = src;
           } else {
             const baseUrl = new URL(targetUrl).origin;
             if (src.startsWith("/")) {
                photoUrl = `${baseUrl}${src}`;
             } else {
                // MyNeta often uses relative paths like "images/candidate/..."
                // We should append to the directory of targetUrl if it's not root relative
                // But targetUrl ends in slash usually.
                // Let's safe bet on base + src if it looks like path
                // Actually MyNeta structure is simple.
                photoUrl = `${baseUrl}/${src.replace(/^\//, "")}`;
             }
           }
        }
      }

      if (!photoUrl) {
        photoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
      }

      if (name && constituency && party) {
        extractedData.push({
          name,
          constituency,
          party,
          criminalCases,
          assets,
          photoUrl
        });
      }
    });

    if (extractedData.length === 0) {
      throw new Error("No politicians extracted from table");
    }

    // Delete old politicians to prevent duplicates and keep data fresh 
    await db.delete(politicians).where(eq(politicians.state_id, state.id));

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
            eq(constituencies.name, data.constituency)
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
            name: data.constituency,
            type: "Assembly", // Default
            district: null,
          })
          .returning({ id: constituencies.id });
        constituencyId = inserted.id;
      }

      // 2. Upsert Politician
      // Generate slug
      const slug = `${stateCode.toLowerCase()}-${data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")}-${data.constituency
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
        assets_worth: data.assets, // Drizzle handles number -> bigint conversion for inserts usually
        photo_url: data.photoUrl,
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
