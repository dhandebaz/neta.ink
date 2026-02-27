import { db } from "@/db/client";
import { politicians, rti_requests, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendEmail } from "@/lib/email/transporter";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

function formatFilenameDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function fulfillRti(rtiId: number) {
  if (!Number.isFinite(rtiId) || rtiId <= 0) {
    return;
  }

  const [row] = await db
    .select({
      id: rti_requests.id,
      status: rti_requests.status,
      rti_text: rti_requests.rti_text,
      created_at: rti_requests.created_at,
      pdf_url: rti_requests.pdf_url,
      user_email: users.email,
      user_name: users.name,
      politician_name: politicians.name,
      politician_position: politicians.position
    })
    .from(rti_requests)
    .leftJoin(users, eq(users.id, rti_requests.user_id))
    .leftJoin(politicians, eq(politicians.id, rti_requests.politician_id))
    .where(eq(rti_requests.id, rtiId))
    .limit(1);

  if (!row) {
    return;
  }

  const to = (row.user_email || "").trim();

  if (!to) {
    return;
  }

  const bodyText = (row.rti_text || "").trim();

  if (!bodyText) {
    return;
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
  const datePart = formatFilenameDate(row.created_at ?? new Date());
  const filename = `RTI_Request_${datePart}_${row.id}.pdf`;

  const targetLabel =
    row.politician_name && row.politician_name.trim().length > 0
      ? `${row.politician_position || "MLA"} ${row.politician_name}`
      : "Public Information Officer";

  const userLabel = row.user_name && row.user_name.trim().length > 0 ? row.user_name : "Citizen";

  const subject = `RTI Draft Ready — ${targetLabel}`;

  const html = [
    `<p>Hi ${userLabel},</p>`,
    `<p>Your RTI draft is ready. You can download the attached PDF and file it on the official portal.</p>`,
    `<p><strong>Target</strong>: ${targetLabel}</p>`,
    `<p>Regards,<br/>Neta.ink</p>`
  ].join("\n");

  await sendEmail({
    to,
    subject,
    html,
    attachments: [
      {
        filename,
        content: Buffer.from(bytes),
        contentType: "application/pdf"
      }
    ]
  });

  const nextPdfUrl = `/api/rti/${row.id}/pdf`;
  if (!row.pdf_url || row.pdf_url.trim().length === 0) {
    await db
      .update(rti_requests)
      .set({ pdf_url: nextPdfUrl })
      .where(eq(rti_requests.id, row.id));
  }
}

