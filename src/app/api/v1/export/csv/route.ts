import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/db/client";
import { politicians, complaints } from "@/db/schema";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();

  if (!user || user.api_limit === 0) {
    return NextResponse.json({ error: "Unauthorized or Upgrade required" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  if (type === "politicians") {
    const data = await db.select().from(politicians);
    
    if (data.length === 0) {
       return new NextResponse("", {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": 'attachment; filename="politicians.csv"'
        }
      });
    }

    const csvHeader = Object.keys(data[0]).join(",") + "\n";
    const csvRows = data.map(row => 
      Object.values(row).map(v => {
        if (v === null || v === undefined) return "";
        const s = String(v);
        if (s.includes(",") || s.includes('"') || s.includes("\n")) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      }).join(",")
    ).join("\n");
    
    return new NextResponse(csvHeader + csvRows, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="politicians.csv"'
      }
    });
  } else if (type === "complaints") {
    const data = await db.select().from(complaints);
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="complaints.json"'
      }
    });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
