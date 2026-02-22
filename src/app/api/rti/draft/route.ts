import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { constituencies, politicians, states, usage_events, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AiJsonError, GenerateRtiDraftParams, generateRtiDraft } from "@/lib/aiPrompts";
import { getIpKey, getUserKey, rateLimit } from "@/lib/rateLimit";
import { getCurrentUser } from "@/lib/auth/session";

type TargetType = "MP" | "MLA" | "DEPT";

type DraftBody = {
  targetType: TargetType;
  targetId?: number;
  question: string;
  userDetails?: {
    name?: string;
    address?: string;
    email?: string;
  };
};

type DraftResult = {
  rti_text: string;
  pio_name: string | null;
  pio_address: string | null;
  filing_instructions: string[];
  safe?: boolean;
  safety_reason?: string;
};

const RTI_DRAFT_ENDPOINT = "/api/rti/draft";
const RTI_DRAFT_TASK_TYPE = "rti_draft";

async function logUsage(options: {
  userId?: number;
  stateCode?: string;
  success: boolean;
  statusCode: number;
  errorCode?: string;
}) {
  const userIdValue =
    typeof options.userId === "number" && Number.isFinite(options.userId)
      ? options.userId
      : null;

  await db.insert(usage_events).values({
    user_id: userIdValue,
    task_type: RTI_DRAFT_TASK_TYPE,
    state_code: options.stateCode ?? null,
    endpoint: RTI_DRAFT_ENDPOINT,
    success: options.success,
    status_code: options.statusCode,
    error_code: options.errorCode ?? null
  });
}

export async function POST(req: NextRequest) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { success: false, error: "Authentication required", data: null },
      { status: 401 }
    );
  }

  const body = (await req.json().catch(() => null)) as DraftBody | null;

  if (!body) {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body", data: null },
      { status: 400 }
    );
  }

  const { targetType, targetId, question, userDetails } = body;

  if (!targetType || !question || !question.trim()) {
    return NextResponse.json(
      { success: false, error: "targetType and non-empty question are required", data: null },
      { status: 400 }
    );
  }

  const userId = currentUser.id;

  const ipKey = getIpKey(req, "rti_draft");
  const ipLimit = await rateLimit(ipKey, 20, 3600);

  if (!ipLimit.allowed) {
    await logUsage({
      userId,
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

  const userKey = getUserKey(userId, "rti_draft");
  const userLimit = await rateLimit(userKey, 50, 3600);

  if (!userLimit.allowed) {
    await logUsage({
      userId,
      success: false,
      statusCode: 429,
      errorCode: "RATE_LIMIT_USER"
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

  const [state] = await db
    .select()
    .from(states)
    .where(eq(states.code, currentUser.state_code))
    .limit(1);

  const stateName = state?.name ?? "Delhi";
  const stateCode = currentUser.state_code ?? "DL";

  let targetSummary = "Public Information Officer";
  let targetName: string | undefined;
  let targetConstituency: string | undefined;

  if ((targetType === "MP" || targetType === "MLA") && targetId) {
    const [pol] = await db
      .select()
      .from(politicians)
      .where(eq(politicians.id, targetId))
      .limit(1);

    if (pol) {
      let constituencyName = "";

      if (pol.constituency_id) {
        const [c] = await db
          .select()
          .from(constituencies)
          .where(eq(constituencies.id, pol.constituency_id))
          .limit(1);

        if (c) {
          constituencyName = c.name;
        }
      }

      const position = pol.position || targetType;
      const name = pol.name || "Unknown";
      const constituencyLabel = constituencyName
        ? ` for ${constituencyName}, ${stateName}`
        : `, ${stateName}`;

      targetSummary = `${position} ${name}${constituencyLabel}`;
      targetName = pol.name || undefined;
      targetConstituency = constituencyName || undefined;
    }
  }

  const citizenName = userDetails?.name?.trim() || "";
  const citizenAddress = userDetails?.address?.trim() || "";
  const citizenEmail = userDetails?.email?.trim() || "";

  const aiParams: GenerateRtiDraftParams = {
    question,
    userName: citizenName || undefined,
    userAddress: citizenAddress || undefined,
    userEmail: citizenEmail || undefined,
    targetType,
    targetName,
    targetConstituency,
    stateName,
    stateCode
  };

  let result: DraftResult;

  try {
    const modelResult = await generateRtiDraft(aiParams);

    if (modelResult.safe === false) {
      await logUsage({
        userId,
        stateCode,
        success: false,
        statusCode: 400,
        errorCode: "UNSAFE_INPUT"
      });
      return NextResponse.json(
        {
          success: false,
          error: modelResult.safety_reason || "Request not allowed",
          data: null
        },
        { status: 400 }
      );
    }

    result = {
      rti_text: modelResult.rti_text,
      pio_name: modelResult.pio_name,
      pio_address: modelResult.pio_address,
      filing_instructions: modelResult.filing_instructions
    };
  } catch (error) {
    if (error instanceof AiJsonError) {
      console.error("AI RTI draft returned invalid JSON", error);
      await logUsage({
        userId,
        stateCode,
        success: false,
        statusCode: 502,
        errorCode: "AI_INVALID_JSON"
      });
      return NextResponse.json(
        { success: false, error: "AI response invalid", data: null },
        { status: 502 }
      );
    }

    console.error("AI error during RTI draft", error);
    await logUsage({
      userId,
      stateCode,
      success: false,
      statusCode: 502,
      errorCode: "AI_ERROR"
    });
    return NextResponse.json(
      { success: false, error: "AI drafting failed", data: null },
      { status: 502 }
    );
  }

  if (!result.rti_text.trim()) {
    await logUsage({
      userId,
      stateCode,
      success: false,
      statusCode: 502,
      errorCode: "EMPTY_DRAFT"
    });
    return NextResponse.json(
      { success: false, error: "RTI draft was empty", data: null },
      { status: 502 }
    );
  }

  await logUsage({
    userId,
    stateCode,
    success: true,
    statusCode: 200
  });

  return NextResponse.json({
    success: true,
    data: result
  });
}
