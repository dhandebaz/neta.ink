import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { usage_events } from "@/db/schema";
import { getDelhiRepsByConstituencySearch } from "@/lib/lookup/delhi";
import { getIpKey, rateLimit } from "@/lib/rateLimit";

const LOOKUP_ENDPOINT = "/api/lookup/delhi";
const LOOKUP_TASK_TYPE = "lookup";

async function logUsage(options: {
  success: boolean;
  statusCode: number;
  errorCode?: string;
}) {
  await db.insert(usage_events).values({
    user_id: null,
    task_type: LOOKUP_TASK_TYPE,
    state_code: "DL",
    endpoint: LOOKUP_ENDPOINT,
    success: options.success,
    status_code: options.statusCode,
    error_code: options.errorCode ?? null
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as any;
  const query = (body.query ?? "").toString().trim();

  if (!query) {
    return NextResponse.json(
      { error: "Query is required" },
      { status: 400 }
    );
  }

  const ipKey = getIpKey(req, "lookup_delhi");
  const ipLimit = await rateLimit(ipKey, 100, 3600);

  if (!ipLimit.allowed) {
    await logUsage({
      success: false,
      statusCode: 429,
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

  const { constituencyName, mp, mla } =
    await getDelhiRepsByConstituencySearch(query);

  await logUsage({
    success: true,
    statusCode: 200
  });

  return NextResponse.json({
    success: true,
    data: {
      search: query,
      constituencyName,
      mp,
      mla
    }
  });
}
