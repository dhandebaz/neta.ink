import { db } from "@/db/client";
import { complaints, civic_bodies, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { sendEmail } from "@/lib/email/transporter";

export async function fulfillComplaint(complaintId: number) {
  if (!Number.isFinite(complaintId) || complaintId <= 0) {
    return;
  }

  const rows = await db
    .select({
      id: complaints.id,
      title: complaints.title,
      description: complaints.description,
      location_text: complaints.location_text,
      photo_url: complaints.photo_url,
      status: complaints.status,
      department_email: complaints.department_email,
      civic_body_email: civic_bodies.email,
      user_id: complaints.user_id,
      user_email: users.email,
      user_name: users.name
    })
    .from(complaints)
    .leftJoin(users, eq(complaints.user_id, users.id))
    .leftJoin(civic_bodies, eq(complaints.civic_body_id, civic_bodies.id))
    .where(eq(complaints.id, complaintId))
    .limit(1);

  const row = rows[0];

  if (!row) {
    return;
  }

  if (row.status === "filed") {
    return;
  }

  if (row.status !== "pending") {
    return;
  }

  const to = row.department_email || row.civic_body_email;

  if (!to) {
    console.warn("Complaint has no department_email; skipping fulfillment", {
      complaintId: row.id
    });
    return;
  }

  const cc: string[] = [];

  if (row.user_email) {
    cc.push(row.user_email);
  }

  const updated = await db
    .update(complaints)
    .set({
      status: "filed"
    })
    .where(and(eq(complaints.id, row.id), eq(complaints.status, row.status)))
    .returning({ id: complaints.id });

  if (!updated[0]) {
    return;
  }

  const subject = `[Neta.ink Civic Report] ${row.title} - ${row.location_text}`;

  const displayName = row.user_name || "citizen";

  const descriptionHtml = row.description.replace(/\n/g, "<br/>");

  const bodyLines = [
    `<p>This is a formal civic complaint submitted via Neta.ink by a verified citizen.</p>`,
    `<p><strong>Issue summary</strong></p>`,
    `<p>${descriptionHtml}</p>`,
    `<p><strong>Location</strong>: ${row.location_text}</p>`,
    `<p><strong>Complainant</strong>: ${displayName}${
      row.user_email ? ` (${row.user_email})` : ""
    }</p>`,
    `<p>We request that this complaint be acknowledged and that appropriate action be taken in a timely manner. Please share a brief written acknowledgment and reference number so that the citizen can track progress.</p>`,
    `<p>Thank you.</p>`,
    `<p>Neta.ink civic support</p>`
  ].filter(Boolean);

  const html = bodyLines.join("\n");

  const attachments = row.photo_url
    ? [
        {
          path: row.photo_url
        }
      ]
    : undefined;

  await sendEmail({
    to,
    cc: cc.length > 0 ? cc : undefined,
    subject,
    html,
    attachments
  });
}
