import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        user: null
      },
      { status: 200 }
    );
  }

  return NextResponse.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      phone_number: user.phone_number,
      state_code: user.state_code,
      is_system_admin: user.is_system_admin
    }
  });
}

