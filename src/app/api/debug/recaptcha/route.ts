import { NextRequest, NextResponse } from "next/server";
import { createAssessment } from "@/lib/recaptcha-server";

export async function POST(req: NextRequest) {
  try {
    const { token, action } = await req.json();

    if (!token || !action) {
      return NextResponse.json(
        { error: "Missing token or action" },
        { status: 400 }
      );
    }

    const assessment = await createAssessment({
      token,
      recaptchaAction: action
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Invalid token or action mismatch" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      score: assessment.score,
      reasons: assessment.reasons
    });
  } catch (error) {
    console.error("reCAPTCHA assessment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
