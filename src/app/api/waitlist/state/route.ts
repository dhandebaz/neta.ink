import { NextRequest, NextResponse } from "next/server";

type WaitlistBody = {
  stateCode?: string;
  stateName?: string;
  contact?: string;
  source?: string;
};

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as WaitlistBody | null;

  if (!body) {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const stateCode = (body.stateCode ?? "").toString().toUpperCase().trim();
  const stateName = (body.stateName ?? "").toString().trim();
  const contact = (body.contact ?? "").toString().trim();

  if (!stateCode || !stateName || !contact) {
    return NextResponse.json(
      { success: false, error: "stateCode, stateName and contact are required" },
      { status: 400 }
    );
  }

  const source = (body.source ?? "waitlist").toString().trim();

  try {
    console.log("State waitlist entry", {
      stateCode,
      stateName,
      contact,
      source
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to record waitlist entry" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Waitlist entry recorded"
  });
}

