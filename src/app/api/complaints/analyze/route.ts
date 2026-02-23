import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { usage_events } from "@/db/schema";
import { AiJsonError, AnalyzeComplaintParams, analyzeComplaint } from "@/lib/aiPrompts";
import { getIpKey, rateLimit } from "@/lib/rateLimit";
import { isAiComplaintsEnabled } from "@/lib/ai/flags";

type AnalysisResult = {
  issue_type: string;
  severity: "low" | "medium" | "high";
  department_name: string;
  title: string;
  description: string;
  needs_additional_info?: boolean;
  additional_fields?: string[];
  safe?: boolean;
  safety_reason?: string;
};

const ANALYZE_ENDPOINT = "/api/complaints/analyze";
const ANALYZE_TASK_TYPE = "complaint_analyze";

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
    task_type: ANALYZE_TASK_TYPE,
    state_code: options.stateCode ?? null,
    endpoint: ANALYZE_ENDPOINT,
    success: options.success,
    status_code: options.statusCode,
    error_code: options.errorCode ?? null
  });
}

export async function POST(req: NextRequest) {
  const aiEnabled = await isAiComplaintsEnabled();

  if (!aiEnabled) {
    return NextResponse.json(
      {
        success: false,
        error:
          "AI suggestion is temporarily disabled. Please fill in complaint details manually.",
        data: null
      },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => null);

  if (!body || typeof body.photoUrl !== "string") {
    return NextResponse.json(
      { success: false, error: "photoUrl is required", data: null },
      { status: 400 }
    );
  }

  const photoUrl = body.photoUrl as string;
  const locationTextRaw = typeof body.locationText === "string" ? body.locationText : "";
  const locationText = locationTextRaw.trim();

  const stateCodeRaw =
    typeof body.stateCode === "string" ? body.stateCode.toUpperCase().trim() : undefined;
  const stateNameRaw =
    typeof body.stateName === "string" && body.stateName.trim().length > 0
      ? body.stateName.trim()
      : undefined;

  if (!locationText) {
    return NextResponse.json(
      {
        success: false,
        error: "Location is required. Please ask the user for a locality or address in Delhi.",
        data: null
      },
      { status: 400 }
    );
  }

  const ipKey = getIpKey(req, "complaints_analyze");
  const ipLimit = await rateLimit(ipKey, 20, 3600);

  if (!ipLimit.allowed) {
    await logUsage({
      success: false,
      statusCode: 429,
      stateCode: stateCodeRaw ?? "DL",
      errorCode: "RATE_LIMIT"
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

  let parsed: AnalysisResult;

  try {
    const effectiveStateCode = stateCodeRaw ?? "DL";
    const effectiveStateName =
      stateNameRaw ?? (effectiveStateCode === "DL" ? "Delhi" : "the state");

    const params: AnalyzeComplaintParams = {
      photoUrl,
      locationText,
      stateName: effectiveStateName,
      stateCode: effectiveStateCode
    };
    parsed = await analyzeComplaint(params);

    if (parsed.safe === false) {
      await logUsage({
        success: false,
        statusCode: 400,
        stateCode: stateCodeRaw ?? "DL",
        errorCode: "UNSAFE_INPUT"
      });
      return NextResponse.json(
        {
          success: false,
          error: parsed.safety_reason || "Request not allowed",
          data: null
        },
        { status: 400 }
      );
    }
  } catch (error) {
    if (error instanceof AiJsonError) {
      if (error.message === "AI suggestion disabled") {
        await logUsage({
          success: false,
          statusCode: 503,
          stateCode: stateCodeRaw ?? "DL",
          errorCode: "AI_DISABLED"
        });
        return NextResponse.json(
          {
            success: false,
            error:
              "AI suggestion is temporarily disabled. Please fill in complaint details manually.",
            data: null
          },
          { status: 503 }
        );
      }

      console.error("AI complaint analysis returned invalid JSON", error);
      await logUsage({
        success: false,
        statusCode: 502,
        stateCode: stateCodeRaw ?? "DL",
        errorCode: "AI_INVALID_JSON"
      });
      return NextResponse.json(
        { success: false, error: "AI response invalid", data: null },
        { status: 502 }
      );
    }

    console.error("AI error during complaint analysis", error);
    await logUsage({
      success: false,
      statusCode: 502,
      stateCode: stateCodeRaw ?? "DL",
      errorCode: "AI_ERROR"
    });
    return NextResponse.json(
      { success: false, error: "AI analysis failed", data: null },
      { status: 502 }
    );
  }

  const severity =
    parsed.severity === "low" || parsed.severity === "high" ? parsed.severity : "medium";

  await logUsage({
    success: true,
    statusCode: 200,
    stateCode: stateCodeRaw ?? "DL"
  });

  return NextResponse.json({
    success: true,
    data: {
      photoUrl,
      locationText,
      issue_type: parsed.issue_type,
      severity,
      department_name: parsed.department_name,
      title: parsed.title,
      description: parsed.description,
      needs_additional_info: parsed.needs_additional_info ?? false,
      additional_fields: parsed.additional_fields ?? []
    }
  });
}
