import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { constituencies, politicians, states, usage_events } from "@/db/schema";
import { and, asc, eq, ilike } from "drizzle-orm";
import { getIpKey, rateLimit } from "@/lib/rateLimit";

const LOOKUP_TASK_TYPE = "lookup";

async function logUsage(options: {
  success: boolean;
  statusCode: number;
  stateCode: string;
  endpoint: string;
  errorCode?: string;
}) {
  await db.insert(usage_events).values({
    user_id: null,
    task_type: LOOKUP_TASK_TYPE,
    state_code: options.stateCode,
    endpoint: options.endpoint,
    success: options.success,
    status_code: options.statusCode,
    error_code: options.errorCode ?? null
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ stateCode: string }> }
) {
  const resolvedParams = await params;
  const stateCode = resolvedParams.stateCode.toUpperCase();
  const endpoint = `/api/lookup/${stateCode.toLowerCase()}`;

  const body = (await req.json().catch(() => ({}))) as any;
  const query = (body.query ?? "").toString().trim();

  if (!query) {
    return NextResponse.json(
      { error: "Query is required" },
      { status: 400 }
    );
  }

  const ipKey = getIpKey(req, `lookup_${stateCode.toLowerCase()}`);
  const ipLimit = await rateLimit(ipKey, 100, 3600);

  if (!ipLimit.allowed) {
    await logUsage({
      success: false,
      statusCode: 429,
      stateCode,
      endpoint,
      errorCode: "RATE_LIMIT_IP"
    });

    return NextResponse.json(
      {
        success: false,
        error: "Rate limit exceeded. Please try again later.",
        data: null
      },
      { status: 429 }
    );
  }

  // --- Dynamic Lookup Logic ---
  let result = {
    constituencyName: null as string | null,
    mp: null as typeof politicians.$inferSelect | null,
    mla: null as typeof politicians.$inferSelect | null
  };

  try {
    const [stateRow] = await db
      .select()
      .from(states)
      .where(eq(states.code, stateCode))
      .limit(1);

    if (stateRow) {
      const acRows = await db
        .select()
        .from(constituencies)
        .where(
          and(
            eq(constituencies.state_id, stateRow.id),
            eq(constituencies.type, "vidhan_sabha"),
            ilike(constituencies.name, `%${query}%`)
          )
        )
        .orderBy(asc(constituencies.name))
        .limit(1);

      const ac = acRows[0];

      if (ac) {
        result.constituencyName = ac.name;

        const [mlaRow] = await db
          .select()
          .from(politicians)
          .where(
            and(
              eq(politicians.state_id, stateRow.id),
              eq(politicians.position, "MLA"),
              eq(politicians.constituency_id, ac.id)
            )
          )
          .limit(1);
        
        result.mla = mlaRow || null;

        // Placeholder logic for MP matching original implementation
        // Just grabs the first MP found for the state
        const [mpRow] = await db
          .select()
          .from(politicians)
          .where(
            and(
              eq(politicians.state_id, stateRow.id),
              eq(politicians.position, "MP")
            )
          )
          .orderBy(asc(politicians.id))
          .limit(1);
        
        result.mp = mpRow || null;
      }
    }
  } catch (error) {
    console.error(`Error in lookup for ${stateCode}:`, error);
    // Continue to return success false or partial data?
    // Original code returns success true with null data if not found.
  }

  await logUsage({
    success: true,
    statusCode: 200,
    stateCode,
    endpoint
  });

  return NextResponse.json({
    success: true,
    data: {
      search: query,
      constituencyName: result.constituencyName,
      mp: result.mp,
      mla: result.mla
    }
  });
}
