import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { rti_requests } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function formatFilenameDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const resolvedParams = await params;
  const id = Number(resolvedParams.id);

  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid RTI id" }, { status: 400 });
  }

  const [row] = await db
    .select({
      id: rti_requests.id,
      rti_text: rti_requests.rti_text,
      created_at: rti_requests.created_at
    })
    .from(rti_requests)
    .where(and(eq(rti_requests.id, id), eq(rti_requests.user_id, currentUser.id)))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "RTI not found" }, { status: 404 });
  }

  const bodyText = (row.rti_text || "").trim();

  if (!bodyText) {
    return NextResponse.json({ error: "RTI draft is empty" }, { status: 400 });
  }

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);

  const fontSize = 12;
  const lineHeight = Math.ceil(fontSize * 1.45);
  const marginX = 50;
  const marginTop = 60;
  const marginBottom = 70;

  const wrapText = (text: string, maxWidth: number) => {
    const lines: string[] = [];
    const paragraphs = text.split(/\n+/);

    for (const p of paragraphs) {
      const para = p.trim();

      if (!para) {
        lines.push("");
        continue;
      }

      const words = para.split(/\s+/);
      let current = "";

      for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        const w = font.widthOfTextAtSize(candidate, fontSize);
        if (w <= maxWidth) {
          current = candidate;
        } else {
          if (current) lines.push(current);
          current = word;
        }
      }

      if (current) lines.push(current);
      lines.push("");
    }

    while (lines.length > 0 && lines[lines.length - 1] === "") {
      lines.pop();
    }

    return lines;
  };

  const firstPage = pdfDoc.addPage();
  const { width, height } = firstPage.getSize();
  const maxWidth = width - marginX * 2;

  const lines = wrapText(bodyText, maxWidth);

  let page = firstPage;
  let y = height - marginTop;

  for (const line of lines) {
    if (y < marginBottom) {
      page = pdfDoc.addPage();
      y = page.getSize().height - marginTop;
    }

    if (line) {
      page.drawText(line, {
        x: marginX,
        y,
        size: fontSize,
        font,
        color: rgb(0, 0, 0)
      });
    }

    y -= lineHeight;
  }

  for (const p of pdfDoc.getPages()) {
    p.drawText(
      "Digitally drafted via Neta.ink | Scan to track this official's civic record.",
      { x: 50, y: 30, size: 10, color: rgb(0.5, 0.5, 0.5) }
    );
  }

  const bytes = await pdfDoc.save();
  // Cast to any or Buffer to avoid TypeScript BodyInit mismatch with Uint8Array in some Next.js environments
  const safeBytes = Buffer.from(bytes);
  const datePart = formatFilenameDate(row.created_at ?? new Date());
  const filename = `RTI_Request_${datePart}_${row.id}.pdf`;

  return new Response(safeBytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store"
    }
  });
}
