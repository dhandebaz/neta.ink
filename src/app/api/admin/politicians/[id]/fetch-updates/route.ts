import { NextRequest, NextResponse } from "next/server";
import { fetchLivePoliticianUpdates } from "@/lib/ai/hyperTasks";
import { getCurrentUser } from "@/lib/auth/session";

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_req: NextRequest, context: RouteParams) {
  const currentUser = await getCurrentUser();

  if (!currentUser || !currentUser.is_system_admin) {
    return NextResponse.json(
      { success: false, error: "Forbidden" },
      { status: 403 }
    );
  }

  const resolvedParams = await context.params;
  const idRaw = resolvedParams.id;
  const politicianId = Number(idRaw);

  if (!Number.isFinite(politicianId) || politicianId <= 0) {
    return NextResponse.json(
      { success: false, error: "Invalid politician id" },
      { status: 400 }
    );
  }

  try {
    await fetchLivePoliticianUpdates(politicianId);
  } catch (error) {
    console.error("Error fetching live politician updates", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch updates for this politician."
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Updates fetched and saved."
  });
}
